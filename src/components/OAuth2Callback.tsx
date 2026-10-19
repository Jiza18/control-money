import { useEffect, useMemo } from 'react';
import { CircularProgress, Box, Typography, ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme, tokens } from '../theme';
import LogoMark from './LogoMark';
import { saveGoogleSheetsConfig } from '../db/googleSheetsService';

// Esta ruta se renderiza fuera de <App />, así que monta su propio tema con la preferencia guardada
function getSavedMode(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function OAuth2Callback() {
  const mode = useMemo(getSavedMode, []);
  const muiTheme = useMemo(() => getTheme(mode), [mode]);
  const t = tokens[mode];

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          throw new Error('No se recibió el código de autorización');
        }

        // Intercambiar el código por tokens
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
            redirect_uri: `${window.location.origin}/oauth-callback`,
            grant_type: 'authorization_code',
          }),
        });

        if (!response.ok) {
          throw new Error('Error al obtener los tokens');
        }

        const data = await response.json();

        // Guardar los tokens en la base de datos
        await saveGoogleSheetsConfig({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID, // Se mantendrá el valor existente
          sheetName: import.meta.env.VITE_GOOGLE_SHEET_NAME, // Se mantendrá el valor existente
          lastSync: null,
        });

        // Redirigir de vuelta a la configuración
        window.location.href = '/configuration';
      } catch (error) {
        console.error('Error en el callback de OAuth:', error);
        // Redirigir a la configuración con un mensaje de error
        window.location.href = '/?error=auth_failed';
      }
    };

    handleOAuthCallback();
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          px: 2,
          backgroundColor: t.background,
        }}
      >
        <Box
          role="status"
          aria-live="polite"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            maxWidth: 360,
            px: 3,
            py: 4,
            borderRadius: '16px',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            boxShadow: t.shadowMd,
            textAlign: 'center',
          }}
        >
          <LogoMark size={40} />
          <CircularProgress size={28} thickness={4.5} />
          <Box>
            <Typography variant="h6" sx={{ color: t.textPrimary }}>
              Procesando autenticación...
            </Typography>
            <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.5 }}>
              Conectando con Google. Volverás a Configuración en unos segundos.
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
