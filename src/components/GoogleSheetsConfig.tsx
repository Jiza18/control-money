import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined';
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { validateGoogleSheetsConfig } from '../db/googleSheetsService';
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from '../db';
import DatabaseBackup from './DatabaseBackup';
import GoogleSheetsSync from './GoogleSheetsSync';
import BudgetConfig from './BudgetConfig';
import AccountsConfig from './AccountsConfig';
import NotificationSettings from './NotificationSettings';
import AIConfig from './AIConfig';
import { PageHeader } from './ui';
import { tokens } from '../theme';

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

// Bloque plegable de ajustes: icono en cuadradito tintado, título y una línea de descripción
function SettingsSection({ icon, title, description, children, defaultExpanded }: SettingsSectionProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon sx={{ color: t.textMuted }} />}
        sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.75, minWidth: 0 } }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            backgroundColor: t.primarySoft,
            color: t.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': { fontSize: '1.2rem' },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3" sx={{ color: t.textPrimary, lineHeight: 1.3 }}>
            {title}
          </Typography>
          <Typography variant="caption" component="p" sx={{ color: t.textMuted, lineHeight: 1.35 }}>
            {description}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 2.5 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography variant="overline" component="h2" sx={{ color: t.textMuted, px: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>{children}</Box>
    </Box>
  );
}

interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  spreadsheetId: string;
  sheetName: string;
  lastSync: Date | null;
}

export default function GoogleSheetsConfig() {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
    accessToken: '',
    refreshToken: '',
    tokenExpiry: new Date(),
    spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || '',
    sheetName: import.meta.env.VITE_GOOGLE_SHEET_NAME || '',
    lastSync: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    loadConfig();
    const handler = () => loadConfig();
    window.addEventListener('dbTypeChanged', handler as EventListener);
    return () => window.removeEventListener('dbTypeChanged', handler as EventListener);
  }, []);

  const loadConfig = async () => {
    try {
      const configs = await getGoogleSheetsConfig();
      const savedConfig = Array.isArray(configs) ? (configs[0] as any) : undefined;
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Error loading Google Sheets config:', error);
      setError('Error al cargar la configuración. Por favor, intenta recargar la página.');
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!config.spreadsheetId || !config.sheetName) {
        throw new Error('El ID de la hoja y el nombre son requeridos');
      }

      const isValid = await validateGoogleSheetsConfig(config);
      if (!isValid) {
        throw new Error(
          'La configuración proporcionada no es válida. Por favor, verifica tus credenciales y los datos de la hoja de cálculo.'
        );
      }

      await saveGoogleSheetsConfig({
        ...config,
        lastSync: null,
      } as any);
      setSuccess('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving Google Sheets config:', error);
      setError(
        error instanceof Error ? error.message : 'Error al guardar la configuración'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'oauth2callback') {
        const code = event.data.code;
        if (code) {
          try {
            setIsLoading(true);
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: `${window.location.origin}/oauth-popup.html`,
                grant_type: 'authorization_code',
              }),
            });

            if (!response.ok) throw new Error('Error al obtener los tokens');

            const data = await response.json();
            const newConfig = {
              ...config,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
            };

            await saveGoogleSheetsConfig(newConfig);
            setConfig(newConfig);
            setSuccess('Autenticación completada correctamente');
            if (authWindow) {
              authWindow.close();
              setAuthWindow(null);
            }
          } catch (error) {
            console.error('Error en el proceso de autenticación:', error);
            setError('Error durante la autenticación');
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [config, authWindow]);

  const handleAuthClick = async () => {
    try {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${window.location.origin}/oauth-callback&response_type=code&scope=https://www.googleapis.com/auth/spreadsheets&access_type=offline&prompt=consent`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      setError('Error al iniciar el proceso de autenticación');
    }
  };

  return (
    <Box sx={{ maxWidth: 960 }}>
      <PageHeader
        title="Configuración"
        subtitle="Presupuestos, cuentas, asistentes y dónde se guardan tus datos."
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        <SettingsGroup label="Finanzas">
          <SettingsSection
            icon={<AccountBalanceWalletOutlinedIcon />}
            title="Presupuesto por categoría"
            description="Límite mensual de gasto para cada categoría."
          >
            <BudgetConfig />
          </SettingsSection>

          <SettingsSection
            icon={<CreditCardOutlinedIcon />}
            title="Cuentas"
            description="Bancos, tarjetas o efectivo con los que pagas cada gasto."
          >
            <AccountsConfig />
          </SettingsSection>
        </SettingsGroup>

        <SettingsGroup label="Asistentes">
          <SettingsSection
            icon={<NotificationsNoneOutlinedIcon />}
            title="Recordatorios de pagos"
            description="Avisos del navegador antes de cada pago recurrente."
          >
            <NotificationSettings />
          </SettingsSection>

          <SettingsSection
            icon={<AutoAwesomeOutlinedIcon />}
            title="Inteligencia artificial"
            description="Escanea tickets con Claude para rellenar los gastos."
          >
            <AIConfig />
          </SettingsSection>
        </SettingsGroup>

        <SettingsGroup label="Datos y sincronización">
          <SettingsSection
            icon={<StorageOutlinedIcon />}
            title="Base de datos y copia de seguridad"
            description="Almacenamiento local o en la nube, backups y mantenimiento."
            defaultExpanded
          >
            <DatabaseBackup />
          </SettingsSection>

          <SettingsSection
            icon={<CloudSyncOutlinedIcon />}
            title="Sincronización con Google Sheets"
            description="Exporta e importa tus datos desde una hoja de cálculo."
          >
            <GoogleSheetsSync />
          </SettingsSection>

          <SettingsSection
            icon={<TableViewOutlinedIcon />}
            title="Conexión con Google Sheets"
            description="Credenciales OAuth y hoja de cálculo de destino."
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <TextField
                  label="ID de cliente"
                  value={config.clientId}
                  onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Secreto de cliente"
                  type={showSecret ? 'text' : 'password'}
                  value={config.clientSecret}
                  onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                  fullWidth
                  autoComplete="off"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowSecret((v) => !v)}
                          aria-label={showSecret ? 'Ocultar secreto' : 'Mostrar secreto'}
                        >
                          {showSecret ? (
                            <VisibilityOffOutlinedIcon fontSize="small" />
                          ) : (
                            <VisibilityOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="ID de la hoja de cálculo"
                  value={config.spreadsheetId}
                  onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Nombre de la hoja"
                  value={config.sheetName}
                  onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                  fullWidth
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  onClick={handleAuthClick}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  Autenticar con Google
                </Button>
                <Button
                  variant="outlined"
                  onClick={saveConfig}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  Guardar configuración
                </Button>
              </Box>
            </Box>
          </SettingsSection>
        </SettingsGroup>
      </Box>
    </Box>
  );
}
