import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';

interface CategoryChipProps {
  category: string;
  size?: 'small' | 'medium';
}

export default function CategoryChip({ category, size = 'small' }: CategoryChipProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  const getColors = (): { bg: string; color: string } => {
    switch (category) {
      case 'Préstamos':
        return { bg: t.dangerSoft, color: t.danger };
      case 'Gastos Fijos':
        return { bg: t.warningSoft, color: t.warning };
      case 'Comida':
        return { bg: t.successSoft, color: t.success };
      case 'Transporte':
        return { bg: t.infoSoft, color: t.info };
      case 'Entretenimiento':
        return { bg: t.primarySoft, color: t.primary };
      case 'Salud':
        return {
          bg: theme.palette.mode === 'dark' ? '#4C1D95' : '#EDE9FE',
          color: theme.palette.mode === 'dark' ? '#C4B5FD' : '#7C3AED',
        };
      default:
        return { bg: t.surfaceSoft, color: t.textSecondary };
    }
  };

  const { bg, color } = getColors();

  return (
    <Chip
      size={size}
      label={category}
      sx={{
        backgroundColor: bg,
        color,
        fontWeight: 500,
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
