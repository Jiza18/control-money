import { alpha, createTheme } from '@mui/material/styles';

// Design tokens — exportados para uso en componentes.
// Neutros fríos, primario índigo profundo y colores semánticos solo para estados e importes.
export const tokens = {
  light: {
    background: '#F4F5F8',
    surface: '#FFFFFF',
    surfaceSoft: '#F1F3F7',
    surfaceHover: '#F7F8FB',
    border: '#E3E6EC',
    borderStrong: '#CDD2DB',
    textPrimary: '#101828',
    textSecondary: '#475467',
    textMuted: '#7A8494',
    primary: '#4338CA',
    primaryHover: '#3730A3',
    primarySoft: '#EEEEFC',
    onPrimary: '#FFFFFF',
    success: '#047857',
    successSoft: '#E7F5EF',
    warning: '#B45309',
    warningSoft: '#FDF2E1',
    danger: '#C0263D',
    dangerSoft: '#FCEBEE',
    info: '#0369A1',
    infoSoft: '#E6F1F9',
    shadowSm: '0 1px 2px rgba(16,24,40,0.05)',
    shadowMd: '0 1px 3px rgba(16,24,40,0.06), 0 6px 16px -4px rgba(16,24,40,0.08)',
    shadowLg: '0 12px 32px -8px rgba(16,24,40,0.18), 0 4px 8px -4px rgba(16,24,40,0.06)',
  },
  dark: {
    background: '#0B0E14',
    surface: '#131722',
    surfaceSoft: '#1A1F2C',
    surfaceHover: '#171C28',
    border: '#252B39',
    borderStrong: '#343B4C',
    textPrimary: '#EDF0F5',
    textSecondary: '#A8B0C0',
    textMuted: '#6F7889',
    primary: '#8B93F8',
    primaryHover: '#A3A9FA',
    primarySoft: 'rgba(139,147,248,0.14)',
    onPrimary: '#0B0E14',
    success: '#34D399',
    successSoft: 'rgba(52,211,153,0.12)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251,191,36,0.12)',
    danger: '#FB7185',
    dangerSoft: 'rgba(251,113,133,0.12)',
    info: '#38BDF8',
    infoSoft: 'rgba(56,189,248,0.12)',
    shadowSm: '0 1px 2px rgba(0,0,0,0.3)',
    shadowMd: '0 1px 3px rgba(0,0,0,0.35), 0 6px 16px -4px rgba(0,0,0,0.35)',
    shadowLg: '0 16px 40px -8px rgba(0,0,0,0.6)',
  },
};

export type ThemeTokens = (typeof tokens)['light'];

// Color de cada categoría de gasto (punto de color en chips, gráficas y presupuestos)
export const categoryColors: Record<string, { light: string; dark: string }> = {
  'Préstamos':       { light: '#C0263D', dark: '#FB7185' },
  'Gastos Fijos':    { light: '#4338CA', dark: '#8B93F8' },
  'Comida':          { light: '#047857', dark: '#34D399' },
  'Transporte':      { light: '#0369A1', dark: '#38BDF8' },
  'Entretenimiento': { light: '#7E22CE', dark: '#C084FC' },
  'Salud':           { light: '#0F766E', dark: '#2DD4BF' },
  'Ahorro':          { light: '#4D7C0F', dark: '#A3E635' },
  'Otros':           { light: '#64748B', dark: '#94A3B8' },
};

export function getCategoryColor(category: string, mode: 'light' | 'dark'): string {
  return (categoryColors[category] ?? categoryColors['Otros'])[mode];
}

export const fontFamily =
  '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function getTheme(mode: 'light' | 'dark') {
  const t = tokens[mode];
  const focusRing = `0 0 0 3px ${alpha(mode === 'light' ? '#4338CA' : '#8B93F8', 0.28)}`;

  return createTheme({
    palette: {
      mode,
      background: {
        default: t.background,
        paper: t.surface,
      },
      primary: {
        main: t.primary,
        dark: t.primaryHover,
        contrastText: t.onPrimary,
      },
      success: { main: t.success, contrastText: mode === 'light' ? '#fff' : '#0B0E14' },
      warning: { main: t.warning, contrastText: mode === 'light' ? '#fff' : '#0B0E14' },
      error: { main: t.danger, contrastText: mode === 'light' ? '#fff' : '#0B0E14' },
      info: { main: t.info, contrastText: mode === 'light' ? '#fff' : '#0B0E14' },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
        disabled: t.textMuted,
      },
      divider: t.border,
      action: {
        hover: t.surfaceHover,
        selected: t.primarySoft,
      },
    },
    shape: {
      borderRadius: 10,
    },
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    typography: {
      fontFamily,
      h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.025em' },
      h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
      h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em' },
      h4: { fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em' },
      h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' },
      h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.45, letterSpacing: '-0.01em' },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5 },
      subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { WebkitTextSizeAdjust: '100%' },
          body: {
            backgroundColor: t.background,
            color: t.textPrimary,
            fontFeatureSettings: '"cv11", "ss01"',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::selection': { backgroundColor: alpha(t.primary, 0.22) },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.borderStrong} transparent`,
          },
          '*::-webkit-scrollbar': { width: '8px', height: '8px' },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: t.borderStrong,
            borderRadius: '8px',
            border: `2px solid ${t.background}`,
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.border },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowSm,
            backgroundImage: 'none',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
        },
      },
      MuiButtonBase: {
        defaultProps: { disableRipple: false },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            minHeight: 40,
            padding: '8px 16px',
            transition: 'background-color .15s, border-color .15s, color .15s, box-shadow .15s',
            '&.Mui-focusVisible': { boxShadow: focusRing },
          },
          sizeSmall: { minHeight: 32, padding: '4px 12px', fontSize: '0.8125rem', borderRadius: 8 },
          sizeLarge: { minHeight: 48, padding: '10px 20px', fontSize: '0.9375rem' },
          containedPrimary: {
            '&:hover': { backgroundColor: t.primaryHover },
          },
          outlined: {
            borderColor: t.border,
            backgroundColor: t.surface,
            '&:hover': { borderColor: t.borderStrong, backgroundColor: t.surfaceHover },
          },
          outlinedPrimary: { color: t.textPrimary },
          text: { '&:hover': { backgroundColor: t.surfaceSoft } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            color: t.textSecondary,
            transition: 'background-color .15s, color .15s',
            '&:hover': { backgroundColor: t.surfaceSoft, color: t.textPrimary },
            '&.Mui-focusVisible': { boxShadow: focusRing },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: t.shadowLg,
            textTransform: 'none',
            fontWeight: 600,
            '&:active': { boxShadow: t.shadowMd },
          },
          primary: { '&:hover': { backgroundColor: t.primaryHover } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.8125rem',
          },
          sizeSmall: { height: 24, fontSize: '0.75rem' },
          outlined: { borderColor: t.border, backgroundColor: t.surface },
          clickable: { '&:hover': { backgroundColor: t.surfaceSoft } },
          filledPrimary: { backgroundColor: t.primary, color: t.onPrimary },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: t.surface,
            transition: 'box-shadow .15s',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.borderStrong },
            '&.Mui-focused': { boxShadow: focusRing },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.primary, borderWidth: 1 },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: t.danger },
          },
          input: { '&::placeholder': { color: t.textMuted, opacity: 1 } },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: t.textSecondary, '&.Mui-focused': { color: t.primary } },
        },
      },
      MuiInputAdornment: {
        styleOverrides: { root: { color: t.textMuted } },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { marginLeft: 2, color: t.textMuted } },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiSelect: {
        styleOverrides: { icon: { color: t.textMuted } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 4,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowLg,
            borderRadius: 12,
          },
          list: { padding: 4 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: '0.875rem',
            minHeight: 36,
            '&.Mui-selected': { backgroundColor: t.primarySoft },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: { border: `1px solid ${t.border}`, boxShadow: t.shadowLg, borderRadius: 12 },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'light' ? '#101828' : '#EDF0F5',
            color: mode === 'light' ? '#FFFFFF' : '#101828',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: 6,
            padding: '6px 10px',
          },
          arrow: { color: mode === 'light' ? '#101828' : '#EDF0F5' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowLg,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em', padding: '20px 24px 8px' },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { padding: '8px 24px 16px' } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            '&:not(.MuiBackdrop-invisible)': {
              backgroundColor: mode === 'light' ? 'rgba(16,24,40,0.45)' : 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(2px)',
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: t.surface, borderColor: t.border, backgroundImage: 'none' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: t.border } },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: { borderRadius: 14, border: `1px solid ${t.border}`, backgroundColor: t.surface },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: t.surfaceSoft,
              color: t.textMuted,
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              paddingTop: 10,
              paddingBottom: 10,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${t.border}`,
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
          stickyHeader: { backgroundColor: t.surfaceSoft },
          footer: { fontWeight: 600, color: t.textPrimary, fontSize: '0.875rem' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color .12s',
            '&:last-child td, &:last-child th': { borderBottom: 0 },
            '&.MuiTableRow-hover:hover': { backgroundColor: t.surfaceHover },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40 },
          indicator: { height: 2, borderRadius: 2 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: t.textSecondary,
            '&.Mui-selected': { color: t.textPrimary },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: t.surfaceSoft,
            borderRadius: 10,
            padding: 3,
            gap: 2,
            border: `1px solid ${t.border}`,
          },
          grouped: {
            border: 0,
            borderRadius: '8px !important',
            margin: 0,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: t.textSecondary,
            padding: '6px 14px',
            border: 0,
            '&:hover': { backgroundColor: 'transparent', color: t.textPrimary },
            '&.Mui-selected': {
              backgroundColor: t.surface,
              color: t.textPrimary,
              boxShadow: t.shadowSm,
              '&:hover': { backgroundColor: t.surface },
            },
          },
        },
      },
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            borderRadius: '14px !important',
            backgroundColor: t.surface,
            boxShadow: t.shadowSm,
            overflow: 'hidden',
            '&::before': { display: 'none' },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: { minHeight: 60, padding: '0 20px', '&:hover': { backgroundColor: t.surfaceHover } },
          content: { margin: '14px 0' },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: { root: { padding: '4px 20px 20px', borderTop: `1px solid ${t.border}` } },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, fontSize: '0.875rem', alignItems: 'center' },
          standardSuccess: { backgroundColor: t.successSoft, color: t.textPrimary, '& .MuiAlert-icon': { color: t.success } },
          standardError: { backgroundColor: t.dangerSoft, color: t.textPrimary, '& .MuiAlert-icon': { color: t.danger } },
          standardWarning: { backgroundColor: t.warningSoft, color: t.textPrimary, '& .MuiAlert-icon': { color: t.warning } },
          standardInfo: { backgroundColor: t.infoSoft, color: t.textPrimary, '& .MuiAlert-icon': { color: t.info } },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 99, height: 6, backgroundColor: t.surfaceSoft },
          bar: { borderRadius: 99 },
        },
      },
      MuiCheckbox: {
        styleOverrides: { root: { color: t.borderStrong, borderRadius: 6 } },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { borderRadius: 99, backgroundColor: t.borderStrong, opacity: 1 },
          thumb: { boxShadow: 'none' },
          switchBase: {
            '&.Mui-checked + .MuiSwitch-track': { opacity: 1 },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 10, '&.Mui-selected': { backgroundColor: t.primarySoft } },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 64,
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(19,23,34,0.92)',
            backdropFilter: 'saturate(180%) blur(16px)',
            borderTop: `1px solid ${t.border}`,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: t.textMuted,
            minWidth: 0,
            paddingTop: 8,
            '&.Mui-selected': { color: t.primary },
          },
          label: {
            fontSize: '0.6875rem',
            fontWeight: 600,
            marginTop: 2,
            '&.Mui-selected': { fontSize: '0.6875rem' },
          },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiSkeleton: {
        styleOverrides: { root: { backgroundColor: t.surfaceSoft } },
      },
    },
  });
}
