import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';

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
        sx={{ mb: { xs: 8, lg: 2 } }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {current?.message || ''}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
