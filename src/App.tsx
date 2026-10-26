import './App.css';
import { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  SwipeableDrawer,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { initDB } from './db/config';
import BalanceForm from './components/BalanceForm';
import DatabaseIndicator from './components/DatabaseIndicator';
import LogoMark from './components/LogoMark';
import MoreMenuSheet from './components/MoreMenuSheet';
import { getTheme } from './theme';
import { tokens } from './theme';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { ToastProvider } from './contexts/ToastContext';
import { PrivacyProvider, usePrivacy } from './contexts/PrivacyContext';
import { usePaymentReminders } from './hooks/usePaymentReminders';

// Inner layout — requires PrivacyProvider + ToastProvider in ancestry
function AppInner({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [moreOpen, setMoreOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = getTheme(theme);
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));
  const t = tokens[theme];

  const { privacyMode, togglePrivacy } = usePrivacy();
  usePaymentReminders();

  // Sync BottomNavigation with current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/expenses')) setBottomNavValue(0);
    else if (path.startsWith('/savings')) setBottomNavValue(1);
    else if (path.startsWith('/configuration')) setBottomNavValue(2);
    else setBottomNavValue(-1);
  }, [location.pathname]);

  useEffect(() => {
    initDB().catch((error) => {
      console.error('Error al inicializar la base de datos:', error);
    });
  }, []);

  const isCurrentPath = (path: string) => location.pathname.startsWith(`/${path}`);

  const navigateTo = (path: string) => {
    navigate(`/${path}`);
    setMobileDrawerOpen(false);
  };

  const navLinks = [
    { path: 'expenses', label: 'Gastos', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
    { path: 'savings', label: 'Ahorros', icon: <SavingsOutlinedIcon fontSize="small" /> },
    { path: 'configuration', label: 'Configuración', icon: <SettingsOutlinedIcon fontSize="small" /> },
  ];

  const privacyLabel = privacyMode ? 'Mostrar importes' : 'Ocultar importes';
  const themeLabel = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: t.surface,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          height: 64,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <LogoMark size={30} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em', color: t.textPrimary, lineHeight: 1.2 }}>
              Control Money
            </Typography>
            <Typography sx={{ fontSize: '0.6875rem', color: t.textMuted, lineHeight: 1.3 }}>
              Finanzas personales
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Ocultar menú">
          <IconButton
            size="small"
            aria-label="Ocultar menú"
            onClick={() => (isDesktop ? setDrawerOpen(false) : setMobileDrawerOpen(false))}
          >
            <KeyboardDoubleArrowLeftRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Nav links */}
      <Box component="nav" aria-label="Secciones" sx={{ px: 1.5, pt: 1, pb: 2 }}>
        <Typography variant="overline" sx={{ display: 'block', px: 1.25, mb: 0.5, color: t.textMuted }}>
          Menú
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {navLinks.map((link) => {
            const active = isCurrentPath(link.path);
            return (
              <Box
                key={link.path}
                component="button"
                type="button"
                onClick={() => navigateTo(link.path)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  width: '100%',
                  px: 1.25,
                  height: 40,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  backgroundColor: active ? t.primarySoft : 'transparent',
                  color: active ? t.primary : t.textSecondary,
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    backgroundColor: active ? t.primarySoft : t.surfaceSoft,
                    color: active ? t.primary : t.textPrimary,
                  },
                  '&:focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 1 },
                }}
              >
                <Box sx={{ display: 'flex' }}>{link.icon}</Box>
                {link.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Balance form */}
      <Box sx={{ px: 2, flex: 1, overflowY: 'auto' }}>
        <BalanceForm />
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 2,
          mt: 2,
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
          <DatabaseIndicator />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={togglePrivacy}
            startIcon={privacyMode ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
            sx={{ color: t.textSecondary, fontWeight: 500, justifyContent: 'flex-start', minWidth: 0 }}
          >
            {privacyMode ? 'Oculto' : 'Visible'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={toggleTheme}
            startIcon={theme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            sx={{ color: t.textSecondary, fontWeight: 500, justifyContent: 'flex-start', minWidth: 0 }}
          >
            {theme === 'dark' ? 'Claro' : 'Oscuro'}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: t.background,
        display: 'flex',
      }}
    >
      {/* Desktop sidebar */}
      {isDesktop && drawerOpen && (
        <Box
          component="aside"
          sx={{
            width: 264,
            flexShrink: 0,
            borderRight: `1px solid ${t.border}`,
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Desktop sidebar collapsed toggle */}
      {isDesktop && !drawerOpen && (
        <Tooltip title="Mostrar menú" placement="right">
          <IconButton
            size="small"
            aria-label="Mostrar menú"
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'fixed',
              left: 16,
              top: 16,
              zIndex: 200,
              backgroundColor: t.surface,
              border: `1px solid ${t.border}`,
              boxShadow: t.shadowSm,
              '&:hover': { backgroundColor: t.surfaceSoft },
            }}
          >
            <KeyboardDoubleArrowRightRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Mobile swipeable drawer */}
      {!isDesktop && (
        <SwipeableDrawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          onOpen={() => setMobileDrawerOpen(true)}
          PaperProps={{
            sx: {
              width: 288,
              backgroundColor: t.surface,
            },
          }}
        >
          {sidebarContent}
        </SwipeableDrawer>
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile header */}
        {!isDesktop && (
          <Box
            component="header"
            sx={{
              height: 56,
              position: 'sticky',
              top: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              pt: 'env(safe-area-inset-top)',
              boxSizing: 'content-box',
              backdropFilter: 'saturate(180%) blur(16px)',
              backgroundColor:
                theme === 'light'
                  ? 'rgba(244,245,248,0.88)'
                  : 'rgba(11,14,20,0.88)',
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <IconButton aria-label="Abrir menú" onClick={() => setMobileDrawerOpen(true)}>
                <MenuRoundedIcon />
              </IconButton>
              <LogoMark size={26} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em', color: t.textPrimary, ml: 0.25 }}>
                Control Money
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton aria-label={privacyLabel} onClick={togglePrivacy}>
                {privacyMode ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
              </IconButton>
              <IconButton aria-label={themeLabel} onClick={toggleTheme}>
                {theme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Page content */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 1240,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 5 },
            pt: { xs: 2.5, sm: 3, lg: 5 },
            pb: { xs: 'calc(64px + env(safe-area-inset-bottom) + 32px)', lg: 6 },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Bottom navigation: mobile/tablet only */}
      {!isDesktop && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          <BottomNavigation
            showLabels
            value={bottomNavValue}
            onChange={(_, newValue: number) => {
              if (newValue === 0) navigate('/expenses');
              else if (newValue === 1) navigate('/savings');
              else if (newValue === 2) navigate('/configuration');
              setBottomNavValue(newValue);
            }}
            sx={{ height: 'calc(64px + env(safe-area-inset-bottom))', pb: 'env(safe-area-inset-bottom)' }}
          >
            {navLinks.map((link) => (
              <BottomNavigationAction
                key={link.path}
                label={link.path === 'configuration' ? 'Ajustes' : link.label}
                icon={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 28,
                      borderRadius: 99,
                      transition: 'background-color .15s',
                      backgroundColor: isCurrentPath(link.path) ? t.primarySoft : 'transparent',
                      '& svg': { fontSize: '1.3rem' },
                    }}
                  >
                    {link.icon}
                  </Box>
                }
              />
            ))}
          </BottomNavigation>
        </Box>
      )}

      {/* MoreMenuSheet kept but not rendered to avoid breaking imports */}
      {false && (
        <MoreMenuSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          currentTheme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </Box>
  );
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved as 'light' | 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const muiTheme = getTheme(theme);

  // Sync dark class on <html> and persist preference
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    // Barra del navegador en móvil con el mismo fondo que la app
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', tokens[theme].background));
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <PrivacyProvider>
        <ToastProvider>
          <AppInner theme={theme} toggleTheme={toggleTheme} />
        </ToastProvider>
      </PrivacyProvider>
    </ThemeProvider>
  );
}

export default App;
