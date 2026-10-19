import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
        textAlign: 'center',
        gap: 1,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            mb: 1,
            borderRadius: '16px',
            backgroundColor: t.primarySoft,
            color: t.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { fontSize: '28px' },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1" sx={{ color: t.textPrimary }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: t.textSecondary, maxWidth: 360 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
    </Box>
  );
}
