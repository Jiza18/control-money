import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Account, MonthPlan } from '../db/config';
import { tokens } from '../theme';
import { getAllAccounts } from '../db/accountsService';
import { getCurrentBalance } from '../db';
import { ACCOUNTS_CHANGED_EVENT, BALANCE_CHANGED_EVENT, hasBalance } from '../db/accountBalances';
import {
  MONTH_PLAN_CHANGED_EVENT,
  applyPayroll,
  dismissPayroll,
  getMonthPlan,
  undoPayroll,
} from '../db/monthProjection';
import { formatCurrency } from '../utils/formatters';
import { DecimalField, MoneyAmount } from './ui';
import { useToast } from '../contexts/ToastContext';

const REST_ACCOUNT_KEY = 'lastPayrollRestAccountId';

// «¿Ha llegado la nómina?» en el mes en curso: pasa a los saldos reales la nómina y el reparto
export default function PayrollCard({ month }: { month: Date }) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const toast = useToast();
  const name = format(month, 'MMMM', { locale: es });

  const [plan, setPlan] = useState<MonthPlan | undefined | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultIncome, setDefaultIncome] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [open, setOpen] = useState(false);
  const [income, setIncome] = useState<number | undefined>(undefined);
  const [shares, setShares] = useState<Record<number, number | undefined>>({});
  const [restAccountId, setRestAccountId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [p, all, balance] = await Promise.all([getMonthPlan(month), getAllAccounts(), getCurrentBalance()]);
    setPlan(p);
    setAccounts(all.filter(hasBalance));
    setDefaultIncome(balance?.monthlyIncome ?? 0);
    setTotalBalance(balance?.amount ?? 0);
  }, [month]);

  useEffect(() => {
    load();
    const events = [MONTH_PLAN_CHANGED_EVENT, ACCOUNTS_CHANGED_EVENT, BALANCE_CHANGED_EVENT, 'dbTypeChanged'];
    events.forEach((e) => window.addEventListener(e, load));
    return () => events.forEach((e) => window.removeEventListener(e, load));
  }, [load]);

  if (plan === null) return null;

  const applied = Boolean(plan?.appliedAt);
  const appliedAmounts = (plan?.applied ?? []).reduce((s, a) => s + a.amount, 0) + (plan?.appliedToTotal ?? 0);
  // «Ya está en mis saldos» (aplicada sin importes): la tarjeta no vuelve a salir
  if (applied && appliedAmounts === 0) return null;

  const openDialog = () => {
    setIncome(plan?.income ?? defaultIncome);
    setShares(Object.fromEntries((plan?.distribution ?? []).map((d) => [d.accountId, d.amount])));
    let last: number | null = null;
    try {
      last = Number(localStorage.getItem(REST_ACCOUNT_KEY)) || null;
    } catch {
      last = null;
    }
    setRestAccountId(accounts.some((a) => a.id === last) ? (last as number) : '');
    setOpen(true);
  };

  const byAccount = accounts.length > 0;
  const incomeValue = income ?? 0;
  const distributed = accounts.reduce((s, a) => s + (shares[a.id!] ?? 0), 0);
  const rest = Math.round((incomeValue - distributed) * 100) / 100;
  const overDistributed = rest < -0.005;
  const addedTo = (accountId: number) =>
    (shares[accountId] ?? 0) + (restAccountId === accountId && rest > 0 ? rest : 0);

  const handleApply = async () => {
    setSaving(true);
    try {
      await applyPayroll(month, {
        income: incomeValue,
        distribution: accounts.map((a) => ({ accountId: a.id!, amount: shares[a.id!] ?? 0 })),
        restAccountId: restAccountId === '' ? undefined : restAccountId,
      });
      try {
        if (restAccountId !== '') localStorage.setItem(REST_ACCOUNT_KEY, String(restAccountId));
      } catch {
        // Preferencia de comodidad: si no se puede guardar, no pasa nada
      }
      toast.success(`Nómina de ${name} aplicada a tus saldos`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo aplicar la nómina');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    await undoPayroll(month);
    toast.success(`Nómina de ${name} deshecha`);
  };

  const handleDismiss = async () => {
    await dismissPayroll(month);
    toast.info('Perfecto: no se ha cambiado ningún saldo');
  };

  // Aplicada: línea compacta con opción de deshacer
  if (applied) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 1.25,
          borderRadius: '12px',
          border: `1px solid ${t.border}`,
          backgroundColor: t.surface,
        }}
      >
        <CheckCircleOutlineRoundedIcon sx={{ color: t.success, fontSize: '1.2rem', flexShrink: 0 }} />
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: t.textSecondary }}>
          Nómina de {name} aplicada: <strong style={{ color: t.textPrimary }}>{formatCurrency(appliedAmounts)}</strong> sumados a tus saldos
        </Typography>
        <Button size="small" color="inherit" onClick={handleUndo} sx={{ color: t.textSecondary, flexShrink: 0 }}>
          Deshacer
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          p: 2,
          borderRadius: '14px',
          border: `1px solid ${t.primary}`,
          backgroundColor: t.primarySoft,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.onPrimary,
              backgroundColor: t.primary,
            }}
          >
            <PaymentsOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ color: t.textPrimary, lineHeight: 1.3 }}>
              ¿Ha llegado la nómina de {name}?
            </Typography>
            <Typography variant="body2" sx={{ color: t.textSecondary }}>
              {byAccount
                ? 'Aplica el reparto y el saldo de cada cuenta se actualiza solo.'
                : 'Súmala a tu saldo actual con un clic.'}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: 1,
            flexShrink: 0,
            alignSelf: { xs: 'stretch', sm: 'auto' },
          }}
        >
          <Button color="inherit" onClick={handleDismiss} sx={{ color: t.textSecondary, whiteSpace: 'nowrap' }}>
            Ya está en mis saldos
          </Button>
          <Button variant="contained" onClick={openDialog} sx={{ whiteSpace: 'nowrap' }}>
            Aplicar nómina
          </Button>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!overDistributed && incomeValue > 0) handleApply();
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box>
              Nómina de {name}
              <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.25 }}>
                {byAccount ? 'Lo que has cobrado y cómo lo repartes' : 'Lo que has cobrado este mes'}
              </Typography>
            </Box>
            <IconButton aria-label="Cerrar" onClick={() => setOpen(false)} sx={{ mt: -0.5, mr: -1 }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <DecimalField
              label="Nómina cobrada"
              autoFocus
              fullWidth
              value={income}
              onValueChange={setIncome}
              helperText={plan?.income !== undefined ? 'La que planificaste; cámbiala si has cobrado otra cifra' : 'Tus ingresos habituales; cámbiala por lo que has cobrado'}
              InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              inputProps={{ style: { fontSize: '1.25rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
            />

            {byAccount ? (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="overline" sx={{ color: t.textMuted, lineHeight: 1.4 }}>
                    Reparto
                  </Typography>
                  {accounts.map((a) => (
                    <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flex: 1, minWidth: 0, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.name}
                      </Typography>
                      <DecimalField
                        size="small"
                        placeholder="0"
                        value={shares[a.id!]}
                        onValueChange={(value) => setShares((prev) => ({ ...prev, [a.id!]: value }))}
                        inputProps={{ 'aria-label': `Reparto a ${a.name}`, style: { textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
                        InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                        sx={{ width: 130, flexShrink: 0 }}
                      />
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                    p: 1.5,
                    borderRadius: '10px',
                    backgroundColor: overDistributed ? t.dangerSoft : t.surfaceSoft,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: overDistributed ? t.danger : t.textSecondary, fontWeight: 500 }}>
                      {overDistributed ? 'Repartes más de lo que has cobrado' : 'Sin repartir'}
                    </Typography>
                    <MoneyAmount value={rest} size="sm" tone={overDistributed ? 'danger' : 'default'} />
                  </Box>
                  {!overDistributed && rest > 0 && (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="El resto queda en"
                      value={restAccountId}
                      onChange={(e) => setRestAccountId(e.target.value === '' ? '' : Number(e.target.value))}
                      helperText={restAccountId === '' ? 'No se sumará a ninguna cuenta' : undefined}
                    >
                      <MenuItem value="">No sumarlo a ninguna cuenta</MenuItem>
                      {accounts.map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {a.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {accounts
                    .filter((a) => addedTo(a.id!) > 0)
                    .map((a) => (
                      <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: t.textSecondary }}>
                          {a.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                          <MoneyAmount value={a.balance!} size="sm" tone="muted" weight={500} />
                          <Box component="span" sx={{ color: t.textMuted }}>→</Box>
                          <MoneyAmount value={a.balance! + addedTo(a.id!)} size="sm" />
                        </Box>
                      </Box>
                    ))}
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, p: 1.5, borderRadius: '10px', backgroundColor: t.surfaceSoft }}>
                <Typography variant="body2" sx={{ color: t.textSecondary }}>
                  Saldo actual
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <MoneyAmount value={totalBalance} size="sm" tone="muted" weight={500} />
                  <Box component="span" sx={{ color: t.textMuted }}>→</Box>
                  <MoneyAmount value={totalBalance + incomeValue} size="sm" />
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpen(false)} variant="outlined" color="inherit">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving || overDistributed || incomeValue <= 0}>
              Aplicar
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
