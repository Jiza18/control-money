import React, { useState, useEffect } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { keyframes, useTheme } from '@mui/material/styles';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { tokens } from '../theme';
import { createRepositoryFromEnv, getRepositoryFactory } from '../db/repositories/repositoryFactory';
import { getSyncService } from '../db/syncService';
import { setPreferredDatabaseType } from '../db/repositoryAdapter';
import { DatabaseType, SyncResult } from '../db/repositories/interfaces';
import { ENV_CONFIG, logConfig } from '../config/env';
import { getCloudDbConfig, saveCloudDbConfig, isCloudDbConfigValid } from '../db/cloudDbConfig';

interface DatabaseConfigProps {
  onDatabaseTypeChange?: (type: DatabaseType) => void;
}

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ onDatabaseTypeChange }) => {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [currentDbType, setCurrentDbType] = useState<DatabaseType>('local');
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const [tursoConfig, setTursoConfig] = useState({
    url: '',
    authToken: ''
  });

  useEffect(() => {
    // Cargar configuración inicial
    let initialType: DatabaseType = ENV_CONFIG.DB_TYPE;
    if (typeof window !== 'undefined') {
      const pref = localStorage.getItem('preferred_db_type');
      if (pref === 'local' || pref === 'turso') initialType = pref as DatabaseType;
    }
    setCurrentDbType(initialType);
    
    // Intentar cargar configuración guardada en IndexedDB primero
    (async () => {
      try {
        const saved = await getCloudDbConfig();
        if (isCloudDbConfigValid(saved)) {
          setTursoConfig({ url: saved!.url, authToken: saved!.authToken });
        } else {
          setTursoConfig({
            url: ENV_CONFIG.TURSO.DATABASE_URL,
            authToken: ENV_CONFIG.TURSO.AUTH_TOKEN
          });
        }
      } catch {
        setTursoConfig({
          url: ENV_CONFIG.TURSO.DATABASE_URL,
          authToken: ENV_CONFIG.TURSO.AUTH_TOKEN
        });
      }
      // Log de configuración en desarrollo
      logConfig();
      // Verificar conexión inicial
      checkConnection();
    })();
  }, []);

  const handleSaveTursoConfig = async () => {
    try {
      const updated = await saveCloudDbConfig({ url: tursoConfig.url, authToken: tursoConfig.authToken });
      setTursoConfig({ url: updated.url, authToken: updated.authToken });
    } catch (e) {
      console.error('Error guardando configuración de Turso en IndexedDB:', e);
    }
  };

  const checkConnection = async () => {
    try {
      const repository = await createRepositoryFromEnv();
      // Intentar una operación simple para verificar la conexión
      await repository.expenses.findAll();
      setIsConnected(true);
    } catch (error) {
      console.error('Error verificando conexión:', error);
      setIsConnected(false);
    }
  };

  const handleDatabaseTypeChange = async (type: DatabaseType) => {
    try {
      setCurrentDbType(type);
      // Guardar preferencia y cambiar el repositorio actual
      await setPreferredDatabaseType(type);
      await checkConnection();
      onDatabaseTypeChange?.(type);
    } catch (error) {
      console.error('Error cambiando tipo de base de datos:', error);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const factory = getRepositoryFactory();
      const syncService = getSyncService();
      
      // Crear repositorios para ambas bases de datos
      const localRepo = await factory.create({ type: 'local' });
      
      if (!tursoConfig.url || !tursoConfig.authToken) {
        throw new Error('Configuración de Turso incompleta');
      }
      
      const tursoRepo = await factory.create({ 
        type: 'turso', 
        turso: {
          url: tursoConfig.url,
          authToken: tursoConfig.authToken
        }
      });
      
      // Realizar sincronización direccional según BD seleccionada
      // Si el tipo actual es 'local', copiamos de local -> turso
      // Si es 'turso', copiamos de turso -> local
      const result = currentDbType === 'local'
        ? await syncService.syncWithDirection(localRepo, tursoRepo, 'local-to-remote')
        : await syncService.syncWithDirection(tursoRepo, localRepo, 'remote-to-local');
      setSyncResult(result);
      setShowSyncResult(true);
      
      // Ocultar resultado después de 5 segundos
      setTimeout(() => setShowSyncResult(false), 5000);
      
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        recordsTransferred: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      setSyncResult(errorResult);
      setShowSyncResult(true);
      setTimeout(() => setShowSyncResult(false), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const ConnectionStatus = () => (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 26,
        px: 1.25,
        borderRadius: 99,
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: isConnected ? t.successSoft : t.dangerSoft,
        color: isConnected ? t.success : t.danger,
        whiteSpace: 'nowrap',
      }}
    >
      <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'currentColor' }} />
      {isConnected ? 'Conectado' : 'Desconectado'}
    </Box>
  );

  const SyncResultDisplay = () => {
    if (!showSyncResult || !syncResult) return null;

    return (
      <Alert severity={syncResult.success ? 'success' : 'error'} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {syncResult.success ? 'Sincronización exitosa' : 'Error en sincronización'}
        </Typography>

        {syncResult.success && (
          <Typography variant="body2">
            {syncResult.recordsTransferred} registros transferidos
          </Typography>
        )}

        {syncResult.error && (
          <Typography variant="body2">{syncResult.error}</Typography>
        )}

        {syncResult.conflicts && syncResult.conflicts.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Conflictos detectados:</Typography>
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, fontSize: '0.75rem' }}>
              {syncResult.conflicts.map((conflict, index) => (
                <li key={index}>
                  Tabla: {conflict.table}, Registro: {conflict.recordId}
                </li>
              ))}
            </Box>
          </Box>
        )}
      </Alert>
    );
  };

  const dbOptions: { type: DatabaseType; title: string; description: string; icon: React.ReactNode }[] = [
    { type: 'local', title: 'Local', description: 'IndexedDB en el navegador', icon: <StorageOutlinedIcon /> },
    { type: 'turso', title: 'Nube', description: 'Base de datos Turso', icon: <CloudOutlinedIcon /> },
  ];

  const syncDisabled = isSyncing || !isConnected;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="subtitle2" component="h4" sx={{ color: t.textPrimary }}>
          Almacenamiento
        </Typography>
        <Typography variant="caption" component="p" sx={{ color: t.textMuted }}>
          Elige dónde se guardan tus datos.
        </Typography>
      </Box>

      {/* Selector de tipo de base de datos */}
      <Box
        role="radiogroup"
        aria-label="Tipo de base de datos"
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
      >
        {dbOptions.map((opt) => {
          const selected = currentDbType === opt.type;
          return (
            <Box
              key={opt.type}
              component="button"
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleDatabaseTypeChange(opt.type)}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.75,
                minHeight: 64,
                borderRadius: '12px',
                border: `1px solid ${selected ? t.primary : t.border}`,
                backgroundColor: selected ? t.primarySoft : t.surface,
                boxShadow: selected ? `inset 0 0 0 1px ${t.primary}` : 'none',
                transition: 'border-color .15s, background-color .15s',
                '&:hover': { borderColor: selected ? t.primary : t.borderStrong },
                '&:focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 2 },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? t.surface : t.surfaceSoft,
                  color: selected ? t.primary : t.textSecondary,
                  '& svg': { fontSize: '1.2rem' },
                }}
              >
                {opt.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ color: t.textPrimary, lineHeight: 1.3 }}>
                  {opt.title}
                </Typography>
                <Typography variant="caption" sx={{ color: t.textMuted, lineHeight: 1.3 }}>
                  {opt.description}
                </Typography>
              </Box>
              {selected ? (
                <CheckCircleRoundedIcon sx={{ color: t.primary, fontSize: '1.25rem' }} />
              ) : (
                <RadioButtonUncheckedRoundedIcon sx={{ color: t.borderStrong, fontSize: '1.25rem' }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Estado de conexión */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 2,
          py: 1.25,
          borderRadius: '12px',
          backgroundColor: t.surfaceSoft,
        }}
      >
        <Typography variant="body2" sx={{ color: t.textSecondary, fontWeight: 500 }}>
          Estado de conexión
        </Typography>
        <ConnectionStatus />
      </Box>

      {/* Configuración de Turso */}
      {currentDbType === 'turso' && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 2,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
          }}
        >
          <Typography variant="subtitle2" sx={{ color: t.textPrimary }}>
            Credenciales de Turso
          </Typography>
          <TextField
            label="URL de la base de datos"
            value={tursoConfig.url}
            onChange={(e) => setTursoConfig(prev => ({ ...prev, url: e.target.value }))}
            placeholder="libsql://your-database.turso.io"
            fullWidth
            autoComplete="off"
          />
          <TextField
            label="Token de autenticación"
            type="password"
            value={tursoConfig.authToken}
            onChange={(e) => setTursoConfig(prev => ({ ...prev, authToken: e.target.value }))}
            placeholder="eyJ..."
            fullWidth
            autoComplete="off"
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
            }}
          >
            <Button variant="outlined" onClick={handleSaveTursoConfig} sx={{ flexShrink: 0 }}>
              Guardar credenciales en el dispositivo
            </Button>
            <Typography variant="caption" sx={{ color: t.textMuted }}>
              Se guardan de forma local (IndexedDB) y NO se sincronizan.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Botón de sincronización */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSync}
          disabled={syncDisabled}
          startIcon={
            <SyncRoundedIcon sx={isSyncing ? { animation: `${spin} 1s linear infinite` } : undefined} />
          }
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          {isSyncing ? 'Sincronizando...' : 'Sincronizar bases de datos'}
        </Button>
        <Typography variant="caption" sx={{ color: t.textMuted }}>
          Sincroniza los datos entre la base de datos local y la nube.
        </Typography>
      </Box>

      {/* Resultado de sincronización */}
      <SyncResultDisplay />
    </Box>
  );
};
