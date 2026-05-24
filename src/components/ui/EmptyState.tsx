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
        p: 6,
        textAlign: 'center',
        gap: 2,
      }}
    >
      {icon && (
        <Box
          sx={{
            fontSize: '48px',
            color: t.textMuted,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': { fontSize: '48px' },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="body1"
        sx={{ fontWeight: 600, color: t.textPrimary }}
      >
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" sx={{ color: t.textMuted }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
