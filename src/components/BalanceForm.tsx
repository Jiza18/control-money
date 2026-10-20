import { useState, useEffect } from 'react';
import { Box, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { getCurrentBalance, updateBalance } from '../db';
import { Balance } from '../db/config';
import { tokens } from '../theme';
import { BALANCE_CHANGED_EVENT } from '../db/savingsMovementsService';

export default function BalanceForm() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [balance, setBalance] = useState<Balance | null>(null);
  const [incomeVisible, setIncomeVisible] = useState(true);
  const [amountVisible, setAmountVisible] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance || {
        amount: 0,
        monthlyIncome: 0,
        date: new Date()
      });
    };
    loadBalance();

    const handler = () => loadBalance();
    window.addEventListener('dbTypeChanged', handler as any);
    // Aportaciones y retiradas de ahorros cambian el saldo desde fuera
    window.addEventListener(BALANCE_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener('dbTypeChanged', handler as any);
      window.removeEventListener(BALANCE_CHANGED_EVENT, handler);
    };
  }, []);

  const handleBalanceUpdate = async (updates: Partial<Balance>) => {
    if (!balance) return;

    const updatedBalance = {
      ...balance,
      ...updates,
      date: new Date()
    };

    await updateBalance(updatedBalance);
    setBalance(updatedBalance);
    
    // Emitir evento para actualizar el componente Expenses
    const event = new CustomEvent('balanceUpdated');
    document.dispatchEvent(event);
  };

  const fields = [
    {
      id: 'currentBalance',
      label: 'Saldo actual',
      value: balance?.amount || 0,
      visible: amountVisible,
      toggle: () => setAmountVisible((v) => !v),
      onChange: (value: number) => handleBalanceUpdate({ amount: value }),
      hideLabel: 'balance actual',
    },
    {
      id: 'monthlyIncome',
      label: 'Ingresos mensuales',
      value: balance?.monthlyIncome || 0,
      visible: incomeVisible,
      toggle: () => setIncomeVisible((v) => !v),
      onChange: (value: number) => handleBalanceUpdate({ monthlyIncome: value }),
      hideLabel: 'ingreso mensual',
    },
  ];

  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: '12px',
        border: `1px solid ${t.border}`,
        backgroundColor: t.surfaceSoft,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography variant="overline" sx={{ color: t.textMuted, lineHeight: 1 }}>
          Tu balance
        </Typography>
        <Tooltip title="Recalcular gastos">
          <IconButton
            size="small"
            aria-label="Actualizar gastos"
            onClick={() => {
              const event = new CustomEvent('balanceUpdated');
              document.dispatchEvent(event);
            }}
            sx={{ width: 28, height: 28, mr: -0.5 }}
          >
            <RefreshRoundedIcon sx={{ fontSize: '1.05rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {fields.map((f) => (
          <Box key={f.id}>
            <Typography
              component="label"
              htmlFor={f.id}
              variant="caption"
              sx={{ display: 'block', color: t.textSecondary, fontWeight: 500, mb: 0.5 }}
            >
              {f.label}
            </Typography>
            <TextField
              id={f.id}
              size="small"
              fullWidth
              type={f.visible ? 'number' : 'password'}
              value={f.value}
              onChange={(e) => f.onChange(Number(e.target.value))}
              autoComplete={f.visible ? 'off' : 'new-password'}
              inputProps={{
                inputMode: 'decimal',
                readOnly: !f.visible,
                style: { fontVariantNumeric: 'tabular-nums', fontWeight: 600 },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={f.toggle}
                      aria-label={f.visible ? `Ocultar ${f.hideLabel}` : `Mostrar ${f.hideLabel}`}
                      sx={{ width: 28, height: 28 }}
                    >
                      {f.visible ? (
                        <VisibilityOutlinedIcon sx={{ fontSize: '1rem' }} />
                      ) : (
                        <VisibilityOffOutlinedIcon sx={{ fontSize: '1rem' }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
