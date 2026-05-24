import { Box, Divider, Typography } from '@mui/material';
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {title && (
        <>
          <Box>
            <Typography
              variant="overline"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: t.textMuted,
                lineHeight: 1,
              }}
            >
              {title}
            </Typography>
            {description && (
              <Typography
                variant="caption"
                sx={{ display: 'block', color: t.textSecondary, mt: 0.25 }}
              >
                {description}
              </Typography>
            )}
          </Box>
          <Divider />
        </>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
