import { useState, useEffect, useCallback } from 'react';
import { Box, IconButton, InputAdornment, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { getCurrentBalance, updateBalance } from '../db';
import { Account, Balance } from '../db/config';
import { tokens } from '../theme';
import { getAllAccounts } from '../db/accountsService';
import {
  ACCOUNTS_CHANGED_EVENT,
  BALANCE_CHANGED_EVENT,
  hasAccountBalances,
} from '../db/accountBalances';
import { DecimalField, MoneyAmount } from './ui';
import AccountBalanceField from './AccountBalanceField';

export default function BalanceForm() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const [balance, setBalance] = useState<Balance | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeVisible, setIncomeVisible] = useState(true);
  const [amountVisible, setAmountVisible] = useState(true);

  const loadBalance = useCallback(async () => {
    const currentBalance = await getCurrentBalance();
    setBalance(currentBalance || {
      amount: 0,
      monthlyIncome: 0,
      date: new Date()
    });
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setAccounts(await getAllAccounts());
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }, []);

  useEffect(() => {
    loadBalance();
    loadAccounts();

    const handler = () => {
      loadBalance();
      loadAccounts();
    };
    window.addEventListener('dbTypeChanged', handler);
    // Saldos de cuentas, pagos y aportaciones a ahorros cambian el saldo desde fuera
    window.addEventListener(BALANCE_CHANGED_EVENT, handler);
    window.addEventListener(ACCOUNTS_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener('dbTypeChanged', handler);
      window.removeEventListener(BALANCE_CHANGED_EVENT, handler);
      window.removeEventListener(ACCOUNTS_CHANGED_EVENT, handler);
    };
  }, [loadBalance, loadAccounts]);

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

  // Con alguna cuenta con saldo, el saldo actual es la suma de las cuentas
  const byAccount = hasAccountBalances(accounts);

  const visibilityButton = (visible: boolean, toggle: () => void, label: string) => (
    <InputAdornment position="end">
      <IconButton
        size="small"
        edge="end"
        onClick={toggle}
        aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
        sx={{ width: 28, height: 28 }}
      >
        {visible ? (
          <VisibilityOutlinedIcon sx={{ fontSize: '1rem' }} />
        ) : (
          <VisibilityOffOutlinedIcon sx={{ fontSize: '1rem' }} />
        )}
      </IconButton>
    </InputAdornment>
  );

  const labelSx = { display: 'block', color: t.textSecondary, fontWeight: 500, mb: 0.5 } as const;
  const inputStyle = { fontVariantNumeric: 'tabular-nums', fontWeight: 600 } as const;

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
        {/* Saldo actual: suma de las cuentas o importe manual */}
        <Box>
          <Typography component="label" htmlFor="currentBalance" variant="caption" sx={labelSx}>
            Saldo actual
          </Typography>
          {byAccount ? (
            <Box
              id="currentBalance"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 1.5,
                minHeight: 40,
                borderRadius: '10px',
                border: `1px solid ${t.border}`,
                backgroundColor: t.surface,
              }}
            >
              <MoneyAmount value={balance?.amount || 0} size="md" weight={700} hidden={!amountVisible} />
              <IconButton
                size="small"
                onClick={() => setAmountVisible((v) => !v)}
                aria-label={amountVisible ? 'Ocultar balance actual' : 'Mostrar balance actual'}
                sx={{ width: 28, height: 28, mr: -0.75 }}
              >
                {amountVisible ? (
                  <VisibilityOutlinedIcon sx={{ fontSize: '1rem' }} />
                ) : (
                  <VisibilityOffOutlinedIcon sx={{ fontSize: '1rem' }} />
                )}
              </IconButton>
            </Box>
          ) : (
            <DecimalField
              id="currentBalance"
              size="small"
              fullWidth
              masked={!amountVisible}
              value={balance?.amount}
              placeholder="0"
              onValueChange={(value) => handleBalanceUpdate({ amount: value ?? 0 })}
              inputProps={{ readOnly: !amountVisible, style: inputStyle }}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
                endAdornment: visibilityButton(amountVisible, () => setAmountVisible((v) => !v), 'balance actual'),
              }}
            />
          )}
          {byAccount && (
            <Typography variant="caption" sx={{ display: 'block', color: t.textMuted, mt: 0.5 }}>
              Suma de tus cuentas
            </Typography>
          )}
        </Box>

        {/* Saldo de cada cuenta */}
        {accounts.length > 0 && (
          <Box>
            <Typography variant="caption" sx={labelSx}>
              {byAccount ? 'Cuentas' : 'Saldo por cuenta'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {accounts.map((account) => (
                <AccountBalanceField key={account.id} account={account} hidden={!amountVisible} />
              ))}
            </Box>
            {!byAccount && (
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted, mt: 0.75, lineHeight: 1.35 }}>
                Si pones el saldo de tus cuentas, el saldo actual será su suma.
              </Typography>
            )}
          </Box>
        )}

        <Box>
          <Typography component="label" htmlFor="monthlyIncome" variant="caption" sx={labelSx}>
            Ingresos mensuales
          </Typography>
          <DecimalField
            id="monthlyIncome"
            size="small"
            fullWidth
            masked={!incomeVisible}
            value={balance?.monthlyIncome}
            placeholder="0"
            onValueChange={(value) => handleBalanceUpdate({ monthlyIncome: value ?? 0 })}
            inputProps={{ readOnly: !incomeVisible, style: inputStyle }}
            InputProps={{
              startAdornment: <InputAdornment position="start">€</InputAdornment>,
              endAdornment: visibilityButton(incomeVisible, () => setIncomeVisible((v) => !v), 'ingreso mensual'),
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
