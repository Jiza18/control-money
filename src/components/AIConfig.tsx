import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { getAIConfig, saveAIConfig } from '../db/aiConfigService';
import { useToast } from '../contexts/ToastContext';

export default function AIConfig() {
  const toast = useToast();
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
      <Typography variant="body2" color="text.secondary">
        Necesitas una API key de{' '}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          console.anthropic.com
        </a>{' '}
        para escanear tickets con IA. La key se guarda solo en tu navegador.
      </Typography>

      <TextField
        label="Anthropic API Key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        type={showKey ? 'text' : 'password'}
        placeholder="sk-ant-..."
        fullWidth
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowKey((v) => !v)} edge="end" size="small">
                {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
        startIcon={saving ? <CircularProgress size={16} /> : undefined}
        sx={{ borderRadius: '12px', alignSelf: 'flex-start' }}
      >
        Guardar API key
      </Button>
    </Box>
  );
}
