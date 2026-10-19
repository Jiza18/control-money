import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  // Sin padding interior (tablas, listas a sangre)
  noPadding?: boolean;
  sx?: SxProps<Theme>;
}

// Tarjeta base de las páginas: borde fino, cabecera opcional con título y acciones
export default function SectionCard({
  title,
  subtitle,
  icon,
  actions,
  children,
  noPadding = false,
  sx,
}: SectionCardProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const hasHeader = Boolean(title || actions);

  return (
    <Box
      sx={[
        {
          backgroundColor: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: '14px',
          boxShadow: t.shadowSm,
          overflow: 'hidden',
          minWidth: 0,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {hasHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, sm: 2.5 },
            py: 1.75,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {icon && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  backgroundColor: t.primarySoft,
                  color: t.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  '& svg': { fontSize: '1.1rem' },
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="subtitle1" component="h2" sx={{ color: t.textPrimary, lineHeight: 1.3 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" component="div" sx={{ color: t.textMuted }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ p: noPadding ? 0 : { xs: 2, sm: 2.5 } }}>{children}</Box>
    </Box>
  );
}
