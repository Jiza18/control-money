import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';

interface ToastMessage {
  id: string;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  // Toast en superficie invertida; el icono usa el color semántico del modo contrario para contrastar
  const inverse = tokens[theme.palette.mode === 'light' ? 'dark' : 'light'];
  const severityColor = {
    success: inverse.success,
    error: inverse.danger,
    info: inverse.info,
    warning: inverse.warning,
  };
  const queueRef = useRef<ToastMessage[]>([]);
  const [current, setCurrent] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current[0];
      setCurrent(next);
      setOpen(true);
    } else {
      setCurrent(null);
    }
  }, []);

  const enqueue = useCallback((message: string, severity: ToastMessage['severity']) => {
    const msg: ToastMessage = { id: `${Date.now()}-${Math.random()}`, message, severity };
    queueRef.current = [...queueRef.current, msg];
    setCurrent((prev) => {
      if (!prev) {
        setOpen(true);
        return msg;
      }
      return prev;
    });
  }, []);

  const handleClose = (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    // Remove processed message and show next
    queueRef.current = queueRef.current.filter((m) => m.id !== current?.id);
    showNext();
  };

  const value: ToastContextValue = {
    success: (msg) => enqueue(msg, 'success'),
    error: (msg) => enqueue(msg, 'error'),
    info: (msg) => enqueue(msg, 'info'),
    warning: (msg) => enqueue(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 'calc(64px + env(safe-area-inset-bottom) + 8px)', lg: 2 } }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity || 'info'}
          variant="standard"
          sx={{
            width: '100%',
            minWidth: { sm: 320 },
            backgroundColor: theme.palette.mode === 'light' ? '#101828' : '#EDF0F5',
            color: theme.palette.mode === 'light' ? '#FFFFFF' : '#101828',
            boxShadow: tokens[theme.palette.mode].shadowLg,
            fontWeight: 500,
            '& .MuiAlert-icon': { color: severityColor[current?.severity || 'info'] },
            '& .MuiAlert-action .MuiIconButton-root': { color: 'inherit', opacity: 0.7 },
          }}
        >
          {current?.message || ''}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
