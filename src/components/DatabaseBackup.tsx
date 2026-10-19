import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Divider,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { tokens } from '../theme';
import { resetDatabase, deleteDatabase } from '../db/config';
import { exportDatabase, importDatabase, clearStore } from '../db';
import { DatabaseConfig } from './DatabaseConfig';
import { DatabaseType } from '../db/repositories/interfaces';

interface DangerActionProps {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  loading?: boolean;
  first?: boolean;
}

// Fila de la zona de peligro: qué hace la acción y su botón
function DangerAction({ title, description, label, onClick, disabled, loading, first }: DangerActionProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'stretch', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1.5,
        borderTop: first ? 'none' : `1px solid ${t.border}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
          {title}
        </Typography>
        <Typography variant="caption" component="p" sx={{ color: t.textSecondary }}>
          {description}
        </Typography>
      </Box>
      <Button
        variant="outlined"
        color="error"
        onClick={onClick}
        disabled={disabled}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{
          flexShrink: 0,
          borderColor: t.danger,
          color: t.danger,
          backgroundColor: t.surface,
          '&:hover': { borderColor: t.danger, backgroundColor: t.dangerSoft },
        }}
      >
        {label}
      </Button>
    </Box>
  );
}

function SubsectionTitle({ title, description }: { title: string; description: ReactNode }) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2" component="h4" sx={{ color: t.textPrimary }}>
        {title}
      </Typography>
      <Typography variant="caption" component="p" sx={{ color: t.textMuted }}>
        {description}
      </Typography>
    </Box>
  );
}

export default function DatabaseBackup() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentDbType, setCurrentDbType] = useState<DatabaseType>('local');

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    setCurrentDbType(type);
    setError(null);
    setSuccess(null);
  };

  // Función para exportar toda la base de datos
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await exportDatabase();

      // Convertir a JSON y crear un blob
      const jsonData = JSON.stringify(data, (_key, value) => {
        // Convertir fechas a formato ISO para que se puedan reconstruir
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        return value;
      }, 2);
      
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Crear un enlace de descarga
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      setSuccess('Copia de seguridad exportada correctamente');
    } catch (error) {
      console.error('Error al exportar la base de datos:', error);
      setError('Error al exportar la base de datos');
    } finally {
      setIsExporting(false);
    }
  };

  // Función para importar la base de datos
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      setError(null);
      setSuccess(null);
      
      try {
        const text = await file.text();
        const data = JSON.parse(text, (_key, value) => {
          // Reconstruir objetos Date
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.value);
          }
          return value;
        });
        
        // Importar los datos utilizando la función del servicio
        await importDatabase(data);
        
        setSuccess('Datos importados correctamente');
      } catch (error) {
        console.error('Error al importar la base de datos:', error);
        setError('Error al importar la base de datos. Asegúrate de que el archivo es válido.');
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  };

  // Función para borrar una tabla específica
  const handleDeleteStore = async (storeName: string) => {
    if (!confirm(`¿Estás seguro de que deseas borrar todos los datos de ${storeName}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await clearStore(storeName as any);
      
      if (result) {
        setSuccess(`Datos de ${storeName} borrados correctamente`);
      } else {
        setError(`La tabla ${storeName} no existe`);
      }
    } catch (error) {
      console.error(`Error al borrar la tabla ${storeName}:`, error);
      setError(`Error al borrar la tabla ${storeName}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para reiniciar completamente la base de datos
  const handleResetDatabase = async () => {
    if (!confirm('¿Estás seguro de que deseas REINICIAR COMPLETAMENTE la base de datos? Esta acción eliminará TODOS los datos y recreará la estructura. Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await resetDatabase();
      setSuccess('Base de datos reiniciada correctamente. Se han creado todas las tablas nuevamente.');
    } catch (error) {
      console.error('Error al reiniciar la base de datos:', error);
      setError(`Error al reiniciar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Función para eliminar la base de datos sin recrearla
  const handleDeleteDatabase = async () => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE la base de datos? Esta acción eliminará la base de datos sin recrearla. Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await deleteDatabase();
      setSuccess('Base de datos eliminada correctamente. Deberás recargar la aplicación para crear una nueva.');
    } catch (error) {
      console.error('Error al eliminar la base de datos:', error);
      setError(`Error al eliminar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {/* Nueva sección de configuración de base de datos */}
      <DatabaseConfig onDatabaseTypeChange={handleDatabaseTypeChange} />

      <Divider />

      <Box>
        <SubsectionTitle
          title="Copia de seguridad"
          description={`Descarga o restaura todos tus datos (${currentDbType === 'local' ? 'Local' : 'Nube'}) en un archivo JSON.`}
        />
        <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={isExporting}
            startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
          >
            Exportar base de datos
          </Button>
          <Button
            variant="outlined"
            onClick={handleImport}
            disabled={isImporting}
            startIcon={isImporting ? <CircularProgress size={16} color="inherit" /> : <FileUploadOutlinedIcon />}
          >
            Importar base de datos
          </Button>
        </Box>
      </Box>

      {/* Zona de peligro */}
      <Box
        sx={{
          borderRadius: '12px',
          border: `1px solid ${alpha(t.danger, 0.3)}`,
          backgroundColor: t.dangerSoft,
          px: { xs: 1.75, sm: 2.25 },
          pt: 1.75,
          pb: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: t.danger }}>
          <WarningAmberRoundedIcon sx={{ fontSize: '1.15rem' }} />
          <Typography variant="subtitle2" component="h4" sx={{ color: t.danger }}>
            Zona de peligro
          </Typography>
        </Box>
        <Typography variant="caption" component="p" sx={{ color: t.textSecondary, mt: 0.25, mb: 0.5 }}>
          Estas acciones borran datos y no se pueden deshacer. Haz antes una copia de seguridad.
        </Typography>
        <Box>
          <DangerAction
            first
            title="Borrar tabla de gastos"
            description="Elimina todos los datos de la tabla de gastos."
            label="Borrar gastos"
            onClick={() => handleDeleteStore('expenses')}
            disabled={isExporting}
          />
          <DangerAction
            title="Borrar tabla de balance"
            description="Elimina todos los datos de la tabla de balance."
            label="Borrar balance"
            onClick={() => handleDeleteStore('balance')}
            disabled={isExporting}
          />
          <DangerAction
            title="Reiniciar base de datos"
            description="Borra todos los datos y vuelve a crear la estructura."
            label="Reiniciar"
            onClick={handleResetDatabase}
            disabled={isResetting}
            loading={isResetting}
          />
          <DangerAction
            title="Eliminar base de datos"
            description="Elimina la base de datos por completo, sin recrearla."
            label="Eliminar"
            onClick={handleDeleteDatabase}
            disabled={isResetting}
            loading={isResetting}
          />
        </Box>
      </Box>
    </Box>
  );
}
