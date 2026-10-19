import React, { useEffect, useState } from 'react';
import {
  SwipeableDrawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
// Removed unused icons for actions we no longer show
import CloudIcon from '@mui/icons-material/Cloud';
import StorageIcon from '@mui/icons-material/Storage';
import { useNavigate } from 'react-router-dom';
import DatabaseIndicator from './DatabaseIndicator';
import BalanceForm from './BalanceForm';

interface MoreMenuSheetProps {
  open: boolean;
  onClose: () => void;
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const MoreMenuSheet: React.FC<MoreMenuSheetProps> = ({ open, onClose, currentTheme, onToggleTheme }) => {
  const navigate = useNavigate();
  const [dbType, setDbType] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('active_db_type');
    setDbType(t);
  }, [open]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          pb: 'calc(16px + env(safe-area-inset-bottom))'
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Más</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Toggle de tema con el mismo icono que en desktop */}
            <IconButton 
              aria-label="Alternar tema"
              title={currentTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={onToggleTheme}
            >
              {currentTheme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
            <IconButton aria-label="Cerrar" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ mt: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Base de datos activa:</Typography>
          {dbType && (
            <Chip
              size="small"
              label={dbType === 'turso' ? 'Nube (Turso)' : 'Local (IndexedDB)'}
              icon={dbType === 'turso' ? <CloudIcon /> : <StorageIcon />}
              color={dbType === 'turso' ? 'primary' : 'default'}
              variant={dbType === 'turso' ? 'filled' : 'outlined'}
            />
          )}
        </Box>

        <DatabaseIndicator />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" sx={{ mb: 1 }}>Balance</Typography>
        <Box sx={{ mb: 2 }}>
          {/* Usamos el formulario existente para visualizar/editar balance e ingreso mensual */}
          <BalanceForm />
        </Box>

        <Divider sx={{ my: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate('/configuration')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Configuración" secondary="Conexión BD, Google Sheets" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </SwipeableDrawer>
  );
};

export default MoreMenuSheet;