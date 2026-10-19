import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

// Cabecera de página: título grande, subtítulo opcional y acciones a la derecha
export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2.5, md: 3 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1.5rem', md: '1.75rem' },
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            color: t.textPrimary,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" component="div" sx={{ color: t.textSecondary, mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
