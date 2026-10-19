import { useState, useEffect } from 'react';
import { Box, TextField, Typography, IconButton, CircularProgress, InputAdornment, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { CategoryChip } from './ui';
import { tokens } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { getAllBudgets, saveBudget, deleteBudget } from '../db/budgetServices';
import { CategoryBudget } from '../db/config';
import { useToast } from '../contexts/ToastContext';

const CATEGORIES = [
  'Préstamos',
  'Gastos Fijos',
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Otros',
];

export default function BudgetConfig() {
  const toast = useToast();
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [budgets, setBudgets] = useState<Record<string, CategoryBudget>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const all = await getAllBudgets();
      const map: Record<string, CategoryBudget> = {};
      const inputMap: Record<string, string> = {};
      all.forEach((b) => {
        map[b.category] = b;
        inputMap[b.category] = b.monthlyBudget > 0 ? String(b.monthlyBudget) : '';
      });
      setBudgets(map);
      setInputs(inputMap);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const handleSave = async (category: string) => {
    const raw = inputs[category] || '0';
    const amount = parseFloat(raw) || 0;
    setSaving((prev) => ({ ...prev, [category]: true }));
    try {
      if (amount === 0) {
        const existing = budgets[category];
        if (existing?.id !== undefined) {
          await deleteBudget(existing.id);
          setBudgets((prev) => {
            const next = { ...prev };
            delete next[category];
            return next;
          });
          toast.success('Presupuesto eliminado');
        }
      } else {
        await saveBudget({ category, monthlyBudget: amount, updatedAt: new Date() });
        toast.success('Presupuesto guardado');
        await loadBudgets();
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Error al guardar el presupuesto');
    } finally {
      setSaving((prev) => ({ ...prev, [category]: false }));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" sx={{ color: t.textSecondary }}>
        Define un presupuesto mensual para cada categoría. Deja en 0 para eliminar.
      </Typography>
      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        {CATEGORIES.map((category, index) => (
          <Box
            key={category}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: { xs: 1.5, sm: 2 },
              py: 1.25,
              borderTop: index === 0 ? 'none' : `1px solid ${t.border}`,
            }}
          >
            <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
              <CategoryChip category={category} size="medium" />
              <Typography variant="caption" sx={{ color: t.textMuted, pl: 0.25 }}>
                {budgets[category]?.monthlyBudget
                  ? `Actual: ${formatCurrency(budgets[category].monthlyBudget)}`
                  : 'Sin presupuesto'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
              <TextField
                type="number"
                size="small"
                placeholder="0"
                value={inputs[category] || ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, [category]: e.target.value }))}
                inputProps={{
                  min: 0,
                  step: 1,
                  inputMode: 'decimal',
                  'aria-label': `Presupuesto mensual de ${category}`,
                  style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
                }}
                sx={{ width: { xs: 112, sm: 140 } }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
              />
              <Tooltip title="Guardar">
                <span>
                  <IconButton
                    onClick={() => handleSave(category)}
                    disabled={saving[category]}
                    aria-label={`Guardar presupuesto de ${category}`}
                    sx={{
                      width: 40,
                      height: 40,
                      border: `1px solid ${t.border}`,
                      color: t.primary,
                      '&:hover': { color: t.primary, backgroundColor: t.primarySoft },
                    }}
                  >
                    {saving[category] ? <CircularProgress size={16} /> : <CheckRoundedIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
