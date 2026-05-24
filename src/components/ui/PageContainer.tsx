import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number | string;
  noPadding?: boolean;
}

export default function PageContainer({
  children,
  maxWidth = 900,
  noPadding = false,
}: PageContainerProps) {
  return (
    <Box
      sx={{
        maxWidth,
        mx: 'auto',
        px: noPadding ? 0 : { xs: 2, sm: 3, md: 4, lg: 6 },
        pb: 8, // safe area for bottom nav
      }}
    >
      {children}
    </Box>
  );
}
