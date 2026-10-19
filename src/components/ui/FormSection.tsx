import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import type { ReactNode } from 'react';

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export default function FormSection({ title, description, children }: FormSectionProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {title && (
        <Box>
          <Typography variant="overline" sx={{ display: 'block', color: t.textMuted, lineHeight: 1.4 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" sx={{ display: 'block', color: t.textSecondary, mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
