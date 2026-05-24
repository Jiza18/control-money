import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Design tokens — exportados para uso en componentes
export const tokens = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceSoft: '#F1F3F5',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#2563EB',
    primarySoft: '#DBEAFE',
    success: '#16A34A',
    successSoft: '#DCFCE7',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    info: '#0891B2',
    infoSoft: '#CFFAFE',
  },
  dark: {
    background: '#0B1120',
    surface: '#111827',
    surfaceSoft: '#1F2937',
    border: '#273449',
    textPrimary: '#F9FAFB',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    primary: '#60A5FA',
    primarySoft: '#1E3A8A',
    success: '#4ADE80',
    successSoft: '#14532D',
    warning: '#FBBF24',
    warningSoft: '#78350F',
    danger: '#F87171',
    dangerSoft: '#7F1D1D',
    info: '#22D3EE',
    infoSoft: '#164E63',
  },
};

export function getTheme(mode: 'light' | 'dark') {
  const t = tokens[mode];

  let theme = createTheme({
    palette: {
      mode,
      background: {
        default: t.background,
        paper: t.surface,
      },
      primary: {
        main: t.primary,
      },
      success: {
        main: t.success,
      },
      warning: {
        main: t.warning,
      },
      error: {
        main: t.danger,
      },
      info: {
        main: t.info,
      },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary,
        disabled: t.textMuted,
      },
      divider: t.border,
    },
    shape: {
      borderRadius: 16,
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    typography: {
      fontFamily:
        'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      h1: {
        fontSize: 'clamp(1.75rem, 1.5rem + 1.2vw, 2.5rem)',
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: 'clamp(1.5rem, 1.35rem + 0.9vw, 2.125rem)',
        fontWeight: 700,
        lineHeight: 1.25,
      },
      h3: {
        fontSize: 'clamp(1.35rem, 1.25rem + 0.6vw, 1.75rem)',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: 'clamp(1.2rem, 1.1rem + 0.5vw, 1.5rem)',
        fontWeight: 600,
        lineHeight: 1.35,
      },
      h5: {
        fontSize: 'clamp(1.05rem, 1rem + 0.4vw, 1.25rem)',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: 'clamp(0.95rem, 0.9rem + 0.3vw, 1.125rem)',
        fontWeight: 600,
        lineHeight: 1.45,
      },
      body1: {
        fontSize: 'clamp(0.95rem, 0.9rem + 0.2vw, 1rem)',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: 'clamp(0.9rem, 0.85rem + 0.15vw, 0.95rem)',
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.border} transparent`,
          },
          '*::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '*::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '*::-webkit-scrollbar-thumb': {
            background: t.border,
            borderRadius: '3px',
            '&:hover': {
              background: t.textMuted,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            boxShadow:
              mode === 'light'
                ? '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
                : 'none',
            border: mode === 'dark' ? `1px solid ${t.border}` : 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 20px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&:active': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 64,
            backdropFilter: 'blur(16px)',
            backgroundColor:
              mode === 'light'
                ? 'rgba(255,255,255,0.85)'
                : 'rgba(17,24,39,0.85)',
            borderTop: `1px solid ${t.border}`,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          label: {
            fontSize: '0.6875rem',
            '&.Mui-selected': {
              fontSize: '0.6875rem',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            height: 6,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
}
