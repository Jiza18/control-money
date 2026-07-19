import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AccountChip } from './ui';
import {
  getAllAccounts,
  addAccount,
  deleteAccount,
} from '../db/accountsService';
import { Account } from '../db/config';
import { tokens } from '../theme';
import { useToast } from '../contexts/ToastContext';

// Paleta de colores predefinidos para las cuentas
const COLOR_OPTIONS = [
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // ámbar
  '#EF4444', // rojo
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#14B8A6', // teal
  '#64748B', // gris
];

export default function AccountsConfig() {
  const toast = useToast();
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const all = await getAllAccounts();
      setAccounts(all);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Escribe un nombre para la cuenta');
      return;
    }
    if (accounts.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Ya existe una cuenta con ese nombre');
      return;
    }
    setSaving(true);
    try {
      await addAccount({ name: trimmed, color, createdAt: new Date() });
      setName('');
      setColor(COLOR_OPTIONS[0]);
      await loadAccounts();
      toast.success('Cuenta creada');
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Error al crear la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteAccount(id);
      await loadAccounts();
      toast.success('Cuenta eliminada');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Crea las cuentas o métodos de pago (efectivo, tarjetas, bancos…) que
        podrás asignar a cada gasto.
      </Typography>

      {/* Lista de cuentas existentes */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {accounts.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Aún no has creado ninguna cuenta.
          </Typography>
        ) : (
          accounts.map((account) => (
            <Box
              key={account.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: '12px',
                border: `1px solid ${t.border}`,
                backgroundColor: t.surface,
              }}
            >
              <AccountChip name={account.name} color={account.color} size="medium" />
              <IconButton
                size="small"
                onClick={() => account.id && handleDelete(account.id)}
                disabled={deletingId === account.id}
                sx={{ color: t.danger }}
              >
                {deletingId === account.id ? (
                  <CircularProgress size={16} />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          ))
        )}
      </Box>

      {/* Formulario de creación */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          pt: 1,
          borderTop: `1px solid ${t.border}`,
        }}
      >
        <TextField
          label="Nombre de la cuenta"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          fullWidth
        />

        {/* Selector de color */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Color:
          </Typography>
          {COLOR_OPTIONS.map((c) => (
            <Box
              key={c}
              onClick={() => setColor(c)}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: c,
                cursor: 'pointer',
                border: color === c ? `2px solid ${t.textPrimary}` : '2px solid transparent',
                boxShadow: color === c ? `0 0 0 2px ${c}55` : 'none',
                transition: 'transform 0.1s',
                '&:hover': { transform: 'scale(1.15)' },
              }}
            />
          ))}
        </Box>

        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          sx={{ borderRadius: '12px', alignSelf: 'flex-start' }}
        >
          Añadir cuenta
        </Button>
      </Box>
    </Box>
  );
}
