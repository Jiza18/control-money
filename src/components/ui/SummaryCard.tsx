import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import MoneyAmount from './MoneyAmount';

interface SummaryCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  helperText?: string;
  hidden?: boolean;
}

export default function SummaryCard({
  label,
  value,
  isCurrency = false,
  tone = 'default',
  icon,
  helperText,
  hidden = false,
}: SummaryCardProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];

  const bgMap: Record<NonNullable<SummaryCardProps['tone']>, string> = {
    default: t.surfaceSoft,
    primary: t.primarySoft,
    success: t.successSoft,
    warning: t.warningSoft,
    danger: t.dangerSoft,
  };

  const colorMap: Record<NonNullable<SummaryCardProps['tone']>, string> = {
    default: t.textPrimary,
    primary: t.primary,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
  };

  const moneyToneMap: Record<
    NonNullable<SummaryCardProps['tone']>,
    'default' | 'primary' | 'success' | 'warning' | 'danger'
  > = {
    default: 'default',
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
  };

  return (
    <Box
      sx={{
        borderRadius: '16px',
        backgroundColor: bgMap[tone],
        px: 2,
        py: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {icon && (
          <Box sx={{ color: colorMap[tone], display: 'flex', fontSize: '1rem' }}>
            {icon}
          </Box>
        )}
        <Typography
          variant="caption"
          sx={{
            color: t.textSecondary,
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box>
        {isCurrency ? (
          <MoneyAmount
            value={typeof value === 'number' ? value : 0}
            size="lg"
            tone={moneyToneMap[tone]}
            hidden={hidden}
          />
        ) : (
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: colorMap[tone],
              lineHeight: 1.2,
            }}
          >
            {hidden ? '••••' : value}
          </Typography>
        )}
      </Box>

      {helperText && (
        <Typography
          variant="caption"
          sx={{ color: t.textMuted, lineHeight: 1.2 }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
