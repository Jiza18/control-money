import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { tokens } from '../theme';
import { getAIConfig, saveAIConfig } from '../db/aiConfigService';
import { useToast } from '../contexts/ToastContext';

export default function AIConfig() {
  const toast = useToast();
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAIConfig().then((config) => {
      if (config?.apiKey) setApiKey(config.apiKey);
    });
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('Introduce tu API key de Anthropic');
      return;
    }
    setSaving(true);
    try {
      await saveAIConfig({ apiKey: apiKey.trim(), updatedAt: new Date() });
      toast.success('API key guardada correctamente');
    } catch {
      toast.error('Error al guardar la API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: t.textSecondary }}>
        Necesitas una API key de{' '}
        <Link
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: t.primary, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          console.anthropic.com
        </Link>{' '}
        para escanear tickets con IA. La key se guarda solo en tu navegador.
      </Typography>

      <TextField
        label="Anthropic API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        type={showKey ? 'text' : 'password'}
        placeholder="sk-ant-..."
        fullWidth
        autoComplete="off"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowKey((v) => !v)}
                edge="end"
                aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
              >
                {showKey ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
      >
        Guardar API key
      </Button>
    </Box>
  );
}
