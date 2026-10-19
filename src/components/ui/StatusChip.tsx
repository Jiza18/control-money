import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';

type StatusType = 'paid' | 'pending' | 'completed' | 'in_progress' | 'active' | 'inactive' | 'overdue';

interface StatusChipProps {
  status: StatusType;
  size?: 'small' | 'medium';
  label?: string;
}

const statusConfig: Record<
  StatusType,
  { label: string; bg: keyof typeof tokens.light; color: keyof typeof tokens.light }
> = {
  paid:        { label: 'Pagado',      bg: 'successSoft', color: 'success' },
  pending:     { label: 'Pendiente',   bg: 'warningSoft', color: 'warning' },
  overdue:     { label: 'Vencido',     bg: 'dangerSoft',  color: 'danger' },
  completed:   { label: 'Completado',  bg: 'successSoft', color: 'success' },
  in_progress: { label: 'En progreso', bg: 'primarySoft', color: 'primary' },
  active:      { label: 'Activa',      bg: 'successSoft', color: 'success' },
  inactive:    { label: 'Inactiva',    bg: 'surfaceSoft', color: 'textMuted' },
};

export default function StatusChip({ status, size = 'small', label }: StatusChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const cfg = statusConfig[status];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: size === 'small' ? 24 : 28,
        px: 1.25,
        borderRadius: 99,
        backgroundColor: t[cfg.bg],
        color: t[cfg.color],
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <Box
        component="span"
        sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }}
      />
      {label ?? cfg.label}
    </Box>
  );
}
