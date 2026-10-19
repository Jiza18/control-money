import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { tokens } from '../theme';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getGoogleSheetsConfig } from '../db';
import { exportToGoogleSheets, importFromGoogleSheets } from '../db/googleSheetsSyncService';

export default function GoogleSheetsSync() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadLastSyncInfo();
    const handler = () => loadLastSyncInfo();
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  const loadLastSyncInfo = async () => {
    try {
      const raw = await getGoogleSheetsConfig();
      const config = Array.isArray(raw) ? raw[0] : raw;
      if (config?.lastSync) {
        setLastSync(new Date(config.lastSync));
      }
    } catch (error) {
      console.error('Error al cargar información de sincronización:', error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const config = await getGoogleSheetsConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets. Por favor, configura primero la conexión.');
      }

      const result = await exportToGoogleSheets();
      setLastSync(result.lastSync);
      
      setSuccess('Datos exportados correctamente a Google Sheets');
    } catch (error) {
      console.error('Error durante la exportación:', error);
      setError(error instanceof Error ? error.message : 'Error durante la exportación');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const config = await getGoogleSheetsConfig();
      if (!config) {
        throw new Error('No hay configuración de Google Sheets. Por favor, configura primero la conexión.');
      }

      const result = await importFromGoogleSheets();
      setLastSync(result.lastSync);
      
      setSuccess('Datos importados correctamente desde Google Sheets');
    } catch (error) {
      console.error('Error durante la importación:', error);
      setError(error instanceof Error ? error.message : 'Error durante la importación');
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: t.textSecondary }}>
          Exporta los totales de gastos y el balance a Google Sheets, o importa los cambios hechos en la hoja.
        </Typography>
        <Tooltip title="La sincronización bidireccional permite exportar los totales de gastos y el balance a Google Sheets, así como importar cambios realizados en la hoja de cálculo de vuelta a la aplicación.">
          <IconButton aria-label="Más información sobre la sincronización" sx={{ mt: -1, mr: -1 }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 1.25,
          borderRadius: '12px',
          backgroundColor: t.surfaceSoft,
        }}
      >
        <ScheduleRoundedIcon sx={{ color: t.textMuted, fontSize: '1.1rem' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" component="p" sx={{ color: t.textMuted, lineHeight: 1.3 }}>
            Estado de sincronización
          </Typography>
          <Typography variant="body2" sx={{ color: t.textPrimary, fontWeight: 600 }}>
            {lastSync 
              ? `Última sincronización: ${format(lastSync, 'dd/MM/yyyy HH:mm:ss', { locale: es })}` 
              : 'No se ha sincronizado aún'}
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {success && <Alert severity="success">{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <CloudUploadOutlinedIcon />}
          onClick={handleExport}
          disabled={isExporting || isImporting}
        >
          {isExporting ? 'Exportando...' : 'Exportar a Google Sheets'}
        </Button>

        <Button
          variant="outlined"
          startIcon={isImporting ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadOutlinedIcon />}
          onClick={handleImport}
          disabled={isExporting || isImporting}
        >
          {isImporting ? 'Importando...' : 'Importar desde Google Sheets'}
        </Button>
      </Box>
    </Box>
  );
}
