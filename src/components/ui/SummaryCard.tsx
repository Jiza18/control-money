import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { tokens } from '../../theme';
import MoneyAmount from './MoneyAmount';
import { usePrivacy } from '../../contexts/PrivacyContext';

interface SummaryCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  helperText?: React.ReactNode;
  hidden?: boolean;
  // 'hero' destaca la cifra principal de la página con fondo de color
  variant?: 'default' | 'hero';
}

export default function SummaryCard({
  label,
  value,
  isCurrency = false,
  tone = 'default',
  icon,
  helperText,
  hidden = false,
  variant = 'default',
}: SummaryCardProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const { privacyMode } = usePrivacy();
  const isHero = variant === 'hero';

  const accent: Record<NonNullable<SummaryCardProps['tone']>, { fg: string; bg: string }> = {
    default: { fg: t.textSecondary, bg: t.surfaceSoft },
    primary: { fg: t.primary, bg: t.primarySoft },
    success: { fg: t.success, bg: t.successSoft },
    warning: { fg: t.warning, bg: t.warningSoft },
    danger: { fg: t.danger, bg: t.dangerSoft },
  };

  // Solo los tonos con significado (positivo/negativo) colorean la cifra
  const valueTone = tone === 'success' || tone === 'danger' ? tone : 'default';
  const heroBg = theme.palette.mode === 'light' ? '#1E1B4B' : '#262A5A';

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: '14px',
        border: `1px solid ${isHero ? 'transparent' : t.border}`,
        backgroundColor: isHero ? heroBg : t.surface,
        backgroundImage: isHero
          ? 'radial-gradient(120% 140% at 100% 0%, rgba(139,147,248,0.35) 0%, rgba(139,147,248,0) 55%)'
          : 'none',
        boxShadow: isHero ? t.shadowMd : t.shadowSm,
        color: isHero ? '#FFFFFF' : t.textPrimary,
        px: { xs: 2, sm: 2.5 },
        py: { xs: 1.75, sm: 2 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: isHero ? 'rgba(255,255,255,0.72)' : t.textSecondary,
            fontWeight: 500,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              width: 30,
              height: 30,
              flexShrink: 0,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isHero ? '#FFFFFF' : accent[tone].fg,
              backgroundColor: isHero ? 'rgba(255,255,255,0.12)' : accent[tone].bg,
              '& svg': { fontSize: '1.05rem' },
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      <Box sx={{ lineHeight: 1.15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {isCurrency ? (
          <MoneyAmount
            value={typeof value === 'number' ? value : 0}
            size="lg"
            tone={isHero ? 'inherit' : valueTone}
            hidden={hidden}
          />
        ) : (
          <Typography
            component="span"
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums',
              color: isHero ? 'inherit' : valueTone === 'default' ? t.textPrimary : t[valueTone],
              lineHeight: 1.15,
            }}
          >
            {hidden || (privacyMode && typeof value === 'number') ? '•••••' : value}
          </Typography>
        )}
      </Box>

      {helperText && (
        <Typography
          variant="caption"
          component="div"
          sx={{ color: isHero ? 'rgba(255,255,255,0.65)' : t.textMuted, lineHeight: 1.3 }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
