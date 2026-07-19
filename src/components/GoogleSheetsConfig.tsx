import { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorageIcon from '@mui/icons-material/Storage';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import TableViewIcon from '@mui/icons-material/TableView';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { validateGoogleSheetsConfig } from '../db/googleSheetsService';
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from '../db';
import DatabaseBackup from './DatabaseBackup';
import GoogleSheetsSync from './GoogleSheetsSync';
import BudgetConfig from './BudgetConfig';
import AccountsConfig from './AccountsConfig';
import NotificationSettings from './NotificationSettings';
import AIConfig from './AIConfig';
import { tokens } from '../theme';

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
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];

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

  const sectionHeaderSx = {
    '& .MuiAccordionSummary-content': {
      alignItems: 'center',
      gap: 1.5,
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Configuración
      </Typography>

      {/* Presupuesto por categoría */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <AccountBalanceWalletIcon sx={{ color: t.warning, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Presupuesto por categoría
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <BudgetConfig />
        </AccordionDetails>
      </Accordion>

      {/* Cuentas / métodos de pago */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <CreditCardIcon sx={{ color: t.primary, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Cuentas
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <AccountsConfig />
        </AccordionDetails>
      </Accordion>

      {/* Recordatorios */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <NotificationsIcon sx={{ color: t.info, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Recordatorios de pagos
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <NotificationSettings />
        </AccordionDetails>
      </Accordion>

      {/* Inteligencia Artificial */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <AutoAwesomeIcon sx={{ color: t.warning, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Inteligencia Artificial
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <AIConfig />
        </AccordionDetails>
      </Accordion>

      {/* Base de datos */}
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <StorageIcon sx={{ color: t.primary, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Base de datos y Backup
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <DatabaseBackup />
        </AccordionDetails>
      </Accordion>

      {/* Google Sheets sync */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <CloudSyncIcon sx={{ color: t.info, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Sincronización
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <GoogleSheetsSync />
        </AccordionDetails>
      </Accordion>

      {/* Google Sheets credentials */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: '16px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={sectionHeaderSx}>
          <TableViewIcon sx={{ color: t.success, fontSize: '1.25rem' }} />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Google Sheets
          </Typography>
        </AccordionSummary>
        <Divider />
        <AccordionDetails sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                fullWidth
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

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={handleAuthClick}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={18} /> : undefined}
                sx={{ borderRadius: '12px' }}
              >
                Autenticar con Google
              </Button>
              <Button
                variant="outlined"
                onClick={saveConfig}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={18} /> : undefined}
                sx={{ borderRadius: '12px' }}
              >
                Guardar configuración
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
