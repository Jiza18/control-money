import { Box, Typography, SwipeableDrawer } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = '90vh',
}: BottomSheetProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      PaperProps={{
        sx: {
          borderRadius: '24px 24px 0 0',
          maxHeight,
          backgroundColor: t.surface,
        },
      }}
    >
      {/* Puller visual */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pt: 1.5,
          pb: 0.5,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 4,
            borderRadius: 2,
            backgroundColor: t.border,
          }}
        />
      </Box>

      {title && (
        <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
      )}

      <Box sx={{ px: 2, pb: 3, overflowY: 'auto' }}>{children}</Box>
    </SwipeableDrawer>
  );
}
