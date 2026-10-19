import { useTheme } from '@mui/material/styles';

type Props = {
  size?: number; // px
};

// Símbolo de Control Money: tres barras ascendentes sobre un cuadrado índigo
export default function LogoMark({ size = 28 }: Props) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="Control Money"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="9" fill={dark ? '#8B93F8' : '#4338CA'} />
      <g fill={dark ? '#0B0E14' : '#FFFFFF'}>
        <rect x="8" y="17" width="4" height="7" rx="2" opacity="0.55" />
        <rect x="14" y="12.5" width="4" height="11.5" rx="2" opacity="0.8" />
        <rect x="20" y="8" width="4" height="16" rx="2" />
      </g>
    </svg>
  );
}
