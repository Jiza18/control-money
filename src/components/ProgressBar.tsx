import { Box, LinearProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../theme';
import { formatPercentage } from '../utils/formatters';

interface ProgressBarProps {
  current: number;
  target: number;
  completed?: boolean;
  height?: number;
  showPercentage?: boolean;
}

export default function ProgressBar({ 
  current, 
  target, 
  completed = false, 
  height = 8, 
  showPercentage = true 
}: ProgressBarProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const progress = Math.min((current / target) * 100, 100);
  const done = completed || progress >= 100;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <LinearProgress
          variant="determinate"
          value={Number.isFinite(progress) ? progress : 0}
          aria-label="Progreso"
          sx={{
            height,
            borderRadius: 99,
            backgroundColor: t.surfaceSoft,
            '& .MuiLinearProgress-bar': {
              borderRadius: 99,
              backgroundColor: done ? t.success : t.primary,
            },
          }}
        />
      </Box>
      {showPercentage && (
        <Typography
          variant="body2"
          sx={{
            minWidth: 38,
            textAlign: 'right',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: done ? t.success : t.textSecondary,
          }}
        >
          {formatPercentage(Math.round(Number.isFinite(progress) ? progress : 0))}
        </Typography>
      )}
    </Box>
  );
}
