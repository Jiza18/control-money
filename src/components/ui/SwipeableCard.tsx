import { useRef, useState, ReactNode } from 'react';
import { Box, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface SwipeableCardProps {
  onDelete: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export default function SwipeableCard({ onDelete, children, disabled = false }: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) {
      setTranslateX(Math.max(diff, -72));
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    isDragging.current = false;
    if (translateX < -36) {
      setTranslateX(-72);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '20px', mb: 1 }}>
      {/* Red delete background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 72,
          backgroundColor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20px',
        }}
      >
        <IconButton
          onClick={onDelete}
          sx={{ color: '#fff' }}
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      </Box>

      {/* Card content */}
      <Box
        onTouchStart={disabled ? undefined : handleTouchStart}
        onTouchMove={disabled ? undefined : handleTouchMove}
        onTouchEnd={disabled ? undefined : handleTouchEnd}
        sx={{
          transform: `translateX(${disabled ? 0 : translateX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
