import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';

type StatusType = 'paid' | 'pending' | 'completed' | 'in_progress' | 'active' | 'inactive';

interface StatusChipProps {
  status: StatusType;
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  StatusType,
  { label: string; bg: keyof typeof tokens.light; color: keyof typeof tokens.light }
> = {
  paid:        { label: 'Pagado',      bg: 'successSoft', color: 'success' },
  pending:     { label: 'Pendiente',   bg: 'warningSoft', color: 'warning' },
  completed:   { label: 'Completado',  bg: 'successSoft', color: 'success' },
  in_progress: { label: 'En progreso', bg: 'infoSoft',    color: 'info' },
  active:      { label: 'Activa',      bg: 'successSoft', color: 'success' },
  inactive:    { label: 'Inactiva',    bg: 'surfaceSoft', color: 'textMuted' },
};

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const cfg = statusConfig[status];

  return (
    <Chip
      size={size}
      label={cfg.label}
      sx={{
        backgroundColor: t[cfg.bg],
        color: t[cfg.color],
        fontWeight: 600,
        borderRadius: '8px',
        border: 'none',
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-label': {
          px: 1,
          fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        },
      }}
    />
  );
}
