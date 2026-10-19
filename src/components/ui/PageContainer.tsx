import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: number | string;
  noPadding?: boolean;
}

export default function PageContainer({
  children,
  maxWidth = 1200,
  noPadding = false,
}: PageContainerProps) {
  return (
    <Box
      sx={{
        maxWidth,
        mx: 'auto',
        px: noPadding ? 0 : { xs: 0, sm: 1 },
      }}
    >
      {children}
    </Box>
  );
}
