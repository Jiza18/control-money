import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="body2" sx={{ color: t.textSecondary }}>
        Crea las cuentas o métodos de pago (efectivo, tarjetas, bancos…) que
        podrás asignar a cada gasto.
      </Typography>

      {/* Lista de cuentas existentes */}
      {accounts.length === 0 ? (
        <Box
          sx={{
            px: 2,
            py: 2.5,
            borderRadius: '12px',
            border: `1px dashed ${t.borderStrong}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" sx={{ color: t.textMuted }}>
            Aún no has creado ninguna cuenta.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          {accounts.map((account, index) => (
            <Box
              key={account.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                pl: 2,
                pr: 1,
                py: 0.75,
                borderTop: index === 0 ? 'none' : `1px solid ${t.border}`,
              }}
            >
              <AccountChip name={account.name} color={account.color} size="medium" />
              <Tooltip title="Eliminar cuenta">
                <span>
                  <IconButton
                    onClick={() => account.id && handleDelete(account.id)}
                    disabled={deletingId === account.id}
                    aria-label={`Eliminar cuenta ${account.name}`}
                    sx={{ width: 40, height: 40, '&:hover': { color: t.danger, backgroundColor: t.dangerSoft } }}
                  >
                    {deletingId === account.id ? (
                      <CircularProgress size={16} />
                    ) : (
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {/* Formulario de creación */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2,
          borderRadius: '12px',
          backgroundColor: t.surfaceSoft,
          border: `1px solid ${t.border}`,
        }}
      >
        <Typography variant="subtitle2" sx={{ color: t.textPrimary }}>
          Nueva cuenta
        </Typography>
        <TextField
          label="Nombre de la cuenta"
          placeholder="Ej.: BBVA, Revolut, Efectivo"
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
        <Box>
          <Typography variant="caption" component="p" sx={{ color: t.textSecondary, fontWeight: 500, mb: 1 }}>
            Color
          </Typography>
          <Box role="radiogroup" aria-label="Color de la cuenta" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map((c) => {
              const selected = color === c;
              return (
                <Box
                  key={c}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  sx={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: selected ? `0 0 0 2px ${t.surfaceSoft}, 0 0 0 4px ${c}` : 'none',
                    transition: 'transform 0.12s, box-shadow 0.12s',
                    '&:hover': { transform: 'scale(1.08)' },
                    '&:focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 3 },
                  }}
                >
                  {selected && <CheckRoundedIcon sx={{ fontSize: '1.1rem' }} />}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
          sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
        >
          Añadir cuenta
        </Button>
      </Box>
    </Box>
  );
}
