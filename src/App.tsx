import './App.css';
import { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  IconButton,
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
import TableChartIcon from '@mui/icons-material/TableChart';
import SavingsIcon from '@mui/icons-material/Savings';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ToastProvider } from './contexts/ToastContext';
import { PrivacyProvider, usePrivacy } from './contexts/PrivacyContext';
import { usePaymentReminders } from './hooks/usePaymentReminders';

const routeTitles: Record<string, string> = {
  '/expenses': 'Gastos',
  '/savings': 'Ahorros',
  '/investments': 'Inversiones',
  '/configuration': 'Configuración',
};

function getRouteTitle(pathname: string): string {
  for (const [key, val] of Object.entries(routeTitles)) {
    if (pathname.startsWith(key)) return val;
  }
  return 'Control Money';
}

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
    else if (path.startsWith('/investments')) setBottomNavValue(2);
    else if (path.startsWith('/configuration')) setBottomNavValue(3);
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
    { path: 'expenses', label: 'Gastos', icon: <TableChartIcon fontSize="small" /> },
    { path: 'savings', label: 'Ahorros', icon: <SavingsIcon fontSize="small" /> },
    { path: 'investments', label: 'Inversiones', icon: <ShowChartIcon fontSize="small" /> },
    { path: 'configuration', label: 'Configuración', icon: <SettingsIcon fontSize="small" /> },
  ];

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
          py: 1.5,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minHeight: 56,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LogoMark size={28} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: t.textPrimary, fontSize: '1rem' }}
          >
            Control Money
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => (isDesktop ? setDrawerOpen(false) : setMobileDrawerOpen(false))}
          sx={{ color: t.textSecondary }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      {/* Balance form */}
      <Box sx={{ px: 2, pt: 2 }}>
        <BalanceForm />
      </Box>

      {/* Nav links */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        <Typography
          variant="overline"
          sx={{
            px: 1.5,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: t.textMuted,
          }}
        >
          Secciones
        </Typography>
        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {navLinks.map((link) => {
            const active = isCurrentPath(link.path);
            return (
              <Box
                key={link.path}
                onClick={() => navigateTo(link.path)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: active ? t.primarySoft : 'transparent',
                  color: active ? t.primary : t.textSecondary,
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    backgroundColor: active ? t.primarySoft : t.surfaceSoft,
                    color: active ? t.primary : t.textPrimary,
                  },
                }}
              >
                <Box sx={{ display: 'flex', opacity: active ? 1 : 0.7 }}>{link.icon}</Box>
                {link.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2,
          py: 2,
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <DatabaseIndicator />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={togglePrivacy} sx={{ color: t.textSecondary }}>
            {privacyMode ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
          <IconButton size="small" onClick={toggleTheme} sx={{ color: t.textSecondary }}>
            {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
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
            width: 260,
            flexShrink: 0,
            borderRight: `1px solid ${t.border}`,
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Desktop sidebar collapsed toggle */}
      {isDesktop && !drawerOpen && (
        <IconButton
          size="small"
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            left: 12,
            top: 12,
            zIndex: 200,
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            color: t.textSecondary,
            '&:hover': { backgroundColor: t.surfaceSoft },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
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
              width: 280,
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
            sx={{
              height: 56,
              position: 'sticky',
              top: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              backdropFilter: 'blur(16px)',
              backgroundColor:
                theme === 'light'
                  ? 'rgba(247,248,250,0.85)'
                  : 'rgba(11,17,32,0.85)',
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <IconButton size="small" onClick={() => setMobileDrawerOpen(true)} sx={{ color: t.textSecondary }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: t.textPrimary }}>
              {getRouteTitle(location.pathname)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton size="small" onClick={togglePrivacy} sx={{ color: t.textSecondary }}>
                {privacyMode ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
              <IconButton size="small" onClick={toggleTheme} sx={{ color: t.textSecondary }}>
                {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Page content */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, pb: { xs: 12, lg: 4 } }}>
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
              else if (newValue === 2) navigate('/investments');
              else if (newValue === 3) navigate('/configuration');
              setBottomNavValue(newValue);
            }}
          >
            <BottomNavigationAction label="Gastos" icon={<TableChartIcon />} />
            <BottomNavigationAction label="Ahorros" icon={<SavingsIcon />} />
            <BottomNavigationAction label="Inversiones" icon={<ShowChartIcon />} />
            <BottomNavigationAction label="Config." icon={<SettingsIcon />} />
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
