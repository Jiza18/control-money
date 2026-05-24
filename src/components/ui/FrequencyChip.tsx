import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';

interface FrequencyChipProps {
  frequency: string;
  size?: 'small' | 'medium';
}

const frequencyLabels: Record<string, string> = {
  'one-time':    'Una vez',
  'monthly':     'Mensual',
  'bi-monthly':  'Cada 2 meses',
  'quarterly':   'Trimestral',
  'annual':      'Anual',
};

export default function FrequencyChip({ frequency, size = 'small' }: FrequencyChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  const label = frequencyLabels[frequency] ?? frequency;

  return (
    <Chip
      size={size}
      label={label}
      sx={{
        backgroundColor: t.surfaceSoft,
        color: t.textSecondary,
        fontWeight: 500,
        borderRadius: '8px',
        border: `1px solid ${t.border}`,
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-label': {
          px: 1,
          fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        },
      }}
    />
  );
}
