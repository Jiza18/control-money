import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import { usePrivacy } from '../../contexts/PrivacyContext';

interface MoneyAmountProps {
  value: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  hidden?: boolean;
  className?: string;
}

const sizeMap: Record<NonNullable<MoneyAmountProps['size']>, string> = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

export default function MoneyAmount({
  value,
  size = 'md',
  tone = 'default',
  hidden = false,
  className,
}: MoneyAmountProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const { privacyMode } = usePrivacy();

  const colorMap: Record<NonNullable<MoneyAmountProps['tone']>, string> = {
    default: t.textPrimary,
    primary: t.primary,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
    muted: t.textMuted,
  };

  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);

  const shouldHide = hidden || privacyMode;

  return (
    <span
      className={className}
      style={{
        fontSize: sizeMap[size],
        fontWeight: 700,
        color: colorMap[tone],
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}
    >
      {shouldHide ? '••••' : formatted}
    </span>
  );
}
