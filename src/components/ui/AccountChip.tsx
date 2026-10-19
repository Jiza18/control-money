import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';

interface AccountChipProps {
  name: string;
  color: string; // hex, e.g. '#3B82F6'
  size?: 'small' | 'medium';
}

export default function AccountChip({ name, color, size = 'small' }: AccountChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: size === 'small' ? 24 : 28,
        px: 1,
        borderRadius: '7px',
        border: `1px solid ${t.border}`,
        backgroundColor: t.surface,
        color: t.textSecondary,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
      />
      {name}
    </Box>
  );
}
