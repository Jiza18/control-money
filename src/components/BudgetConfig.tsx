import { useState, useEffect } from 'react';
import { Box, TextField, Typography, IconButton, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { CategoryChip } from './ui';
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Define un presupuesto mensual para cada categoría. Deja en 0 para eliminar.
      </Typography>
      {CATEGORIES.map((category) => (
        <Box
          key={category}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 130 }}>
            <CategoryChip category={category} size="medium" />
          </Box>
          <TextField
            type="number"
            size="small"
            placeholder="0"
            value={inputs[category] || ''}
            onChange={(e) => setInputs((prev) => ({ ...prev, [category]: e.target.value }))}
            inputProps={{ min: 0, step: 1 }}
            sx={{ width: 140 }}
            InputProps={{
              endAdornment: <Typography variant="caption" color="text.secondary">€</Typography>,
            }}
          />
          <IconButton
            size="small"
            onClick={() => handleSave(category)}
            disabled={saving[category]}
            color="primary"
          >
            {saving[category] ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
          </IconButton>
          {budgets[category]?.monthlyBudget ? (
            <Typography variant="caption" color="text.secondary">
              Actual: {budgets[category].monthlyBudget} €
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
