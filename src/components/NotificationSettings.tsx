import { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useToast } from '../contexts/ToastContext';

export default function NotificationSettings() {
  const toast = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Tu navegador no soporta notificaciones');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Recordatorios activados');
    } else if (result === 'denied') {
      toast.error('Permiso denegado');
    }
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Control Money — Prueba', {
        body: 'Los recordatorios de pagos están funcionando correctamente.',
        icon: '/vite.svg',
        tag: 'test-notification',
      });
      toast.info('Notificación de prueba enviada');
    }
  };

  if (!('Notification' in window)) {
    return (
      <Alert severity="warning">Tu navegador no soporta notificaciones push.</Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Recibe recordatorios cuando tengas pagos recurrentes próximos (en los próximos 7 días).
      </Typography>

      {permission === 'granted' && (
        <Alert severity="success" icon={<NotificationsActiveIcon />}>
          Los recordatorios de pagos están activos. Solo se notifica una vez al día.
        </Alert>
      )}

      {permission === 'denied' && (
        <Alert severity="error">
          El permiso de notificaciones fue denegado. Para activarlos, ve a la configuración de
          tu navegador y permite notificaciones para este sitio.
        </Alert>
      )}

      {permission === 'default' && (
        <Alert severity="info">
          Aún no has concedido permisos de notificación.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {permission !== 'granted' && (
          <Button
            variant="contained"
            onClick={requestPermission}
            startIcon={<NotificationsActiveIcon />}
            sx={{ borderRadius: '12px' }}
          >
            Activar recordatorios
          </Button>
        )}
        {permission === 'granted' && (
          <Button
            variant="outlined"
            onClick={testNotification}
            sx={{ borderRadius: '12px' }}
          >
            Probar notificación
          </Button>
        )}
      </Box>
    </Box>
  );
}
