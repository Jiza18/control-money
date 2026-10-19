import { useEffect, useState } from 'react';
import { Box, CircularProgress, MenuItem, Select, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import { tokens } from '../theme';
import { setPreferredDatabaseType } from '../db';
import { createRepositoryFromEnv } from '../db/repositories/repositoryFactory';

type DbType = 'local' | 'turso';

export default function DatabaseIndicator() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [dbType, setDbType] = useState<DbType>(() => {
    try {
      const preferred = localStorage.getItem('preferred_db_type') as DbType | null;
      if (preferred === 'local' || preferred === 'turso') return preferred;
    } catch {}
    const envType = (import.meta.env.VITE_DB_TYPE || 'local') as DbType;
    return envType;
  });

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [activeType, setActiveType] = useState<DbType>(() => {
    try {
      const active = localStorage.getItem('active_db_type') as DbType | null;
      if (active === 'local' || active === 'turso') return active;
    } catch {}
    return dbType;
  });

  useEffect(() => {
    const handler = (e: any) => {
      const nextType = e?.detail?.type as DbType | undefined;
      if (nextType === 'local' || nextType === 'turso') {
        setDbType(nextType);
        // Mostrar loader mientras cambia desde otro lugar de la app
        setIsSwitching(true);
        // Rechequear conexión cuando cambia el tipo
        checkConnection().finally(() => setIsSwitching(false));
      } else {
        // Releer de localStorage por si acaso
        try {
          const preferred = localStorage.getItem('preferred_db_type') as DbType | null;
          if (preferred === 'local' || preferred === 'turso') {
            setDbType(preferred);
            setIsSwitching(true);
            checkConnection().finally(() => setIsSwitching(false));
          }
        } catch {}
      }
    };
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, []);

  useEffect(() => {
    // Chequeo inicial de conexión
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkConnection = async () => {
    try {
      setIsChecking(true);
      const repo = await createRepositoryFromEnv();
      // operación simple
      await repo.expenses.findAll();
      setIsConnected(true);
      // Actualizar tipo activo
      try {
        const active = localStorage.getItem('active_db_type') as DbType | null;
        if (active === 'local' || active === 'turso') setActiveType(active);
      } catch {}
    } catch (e) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  const label = activeType === 'turso' ? 'Nube (Turso)' : 'Local';

  const handleChange = async (next: DbType) => {
    if (next === dbType) return;
    try {
      setIsSwitching(true);
      setIsConnected(null);
      setIsChecking(true);
      await setPreferredDatabaseType(next);
      setDbType(next);
      await checkConnection();
    } catch (e) {
      console.error('Error al cambiar el tipo de BD:', e);
    }
    finally {
      setIsSwitching(false);
    }
  };

  // Color del punto de estado
  const busy = isSwitching || isChecking;
  const dotColor = busy
    ? t.warning
    : isConnected === true
      ? t.success
      : isConnected === false
        ? t.danger
        : t.textMuted;

  const options: { value: DbType; label: string; icon: React.ReactNode }[] = [
    { value: 'local', label: 'Local', icon: <StorageRoundedIcon sx={{ fontSize: '1rem' }} /> },
    { value: 'turso', label: 'Nube (Turso)', icon: <CloudOutlinedIcon sx={{ fontSize: '1rem' }} /> },
  ];

  return (
    <Box>
      <Typography variant="overline" sx={{ display: 'block', color: t.textMuted, lineHeight: 1, mb: 1 }}>
        Datos
      </Typography>
      <Select
        size="small"
        fullWidth
        value={dbType}
        onChange={(e) => handleChange(e.target.value as DbType)}
        disabled={busy}
        aria-label="Tipo de base de datos"
        aria-busy={busy}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.8125rem' }} aria-live="polite">
            <Box
              component="span"
              sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }}
            />
            <Box component="span" sx={{ fontWeight: 600, color: t.textPrimary }}>{label}</Box>
            {busy && <CircularProgress size={12} thickness={5} sx={{ color: t.textMuted, ml: 'auto' }} />}
          </Box>
        )}
        sx={{ '& .MuiSelect-select': { py: 0.9 } }}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value} sx={{ gap: 1 }}>
            {o.icon}
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
