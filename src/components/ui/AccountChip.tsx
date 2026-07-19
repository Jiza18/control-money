import { Chip } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

interface AccountChipProps {
  name: string;
  color: string; // hex, e.g. '#3B82F6'
  size?: 'small' | 'medium';
}

// Convierte un hex (#RRGGBB) en rgba con la opacidad indicada
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(148,163,184,${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AccountChip({ name, color, size = 'small' }: AccountChipProps) {
  return (
    <Chip
      size={size}
      label={name}
      icon={<AccountBalanceWalletIcon style={{ color, fontSize: size === 'small' ? '0.85rem' : '1rem' }} />}
      sx={{
        backgroundColor: hexToRgba(color, 0.15),
        color,
        fontWeight: 500,
        borderRadius: '8px',
        border: `1px solid ${hexToRgba(color, 0.35)}`,
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
        '& .MuiChip-label': {
          px: 0.75,
          fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        },
      }}
    />
  );
}
