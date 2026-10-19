import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens, getCategoryColor } from '../../theme';

interface CategoryChipProps {
  category: string;
  size?: 'small' | 'medium';
}

export default function CategoryChip({ category, size = 'small' }: CategoryChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const color = getCategoryColor(category, theme.palette.mode);

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
        backgroundColor: t.surfaceSoft,
        color: t.textSecondary,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '3px', backgroundColor: color, flexShrink: 0 }}
      />
      {category}
    </Box>
  );
}
