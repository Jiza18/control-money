import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
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
  const recurring = frequency !== 'one-time';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        height: size === 'small' ? 24 : 28,
        color: t.textMuted,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {recurring && <RepeatRoundedIcon sx={{ fontSize: size === 'small' ? '0.9rem' : '1rem' }} />}
      {label}
    </Box>
  );
}
