import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { es } from 'date-fns/locale';
import { format, subMonths } from 'date-fns';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CallSplitRoundedIcon from '@mui/icons-material/CallSplitRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import { tokens } from '../theme';
import { formatCurrency } from '../utils/formatters';
import { AmountField, MoneyAmount, SectionCard, SummaryCard } from './ui';
import {
  MONTH_PLAN_CHANGED_EVENT,
  MonthForecast as Forecast,
  getMonthForecasts,
  saveMonthPlan,
  suggestDistribution,
} from '../db/monthProjection';
import { ACCOUNTS_CHANGED_EVENT, BALANCE_CHANGED_EVENT } from '../db/accountBalances';
import { useToast } from '../contexts/ToastContext';

interface MonthForecastProps {
  month: Date;
  // Cambia cuando cambian los gastos del mes (alta, edición, pago...) para recalcular
  refreshKey: string;
}

const monthName = (date: Date) => format(date, 'MMMM', { locale: es });

// Previsión de un mes futuro: nómina y reparto por cuenta, y lo que quedará a fin de mes
export default function MonthForecast({ month, refreshKey }: MonthForecastProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  const toast = useToast();
  const [forecast, setForecast] = useState<Forecast | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await getMonthForecasts(month);
      setForecast(all[all.length - 1] ?? null);
    } catch (error) {
      console.error('Error calculando la previsión:', error);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const events = [MONTH_PLAN_CHANGED_EVENT, ACCOUNTS_CHANGED_EVENT, BALANCE_CHANGED_EVENT, 'dbTypeChanged'];
    events.forEach((e) => window.addEventListener(e, load));
    return () => events.forEach((e) => window.removeEventListener(e, load));
  }, [load]);

  if (!forecast) {
    return <Skeleton variant="rounded" height={160} sx={{ borderRadius: '14px' }} />;
  }

  const name = monthName(month);
  const prevName = monthName(subMonths(month, 1));
  const hasAccounts = forecast.accounts.length > 0;

  const setShare = (accountId: number, amount: number | undefined) => {
    const others = forecast.accounts
      .filter((a) => a.accountId !== accountId && a.distributed > 0)
      .map((a) => ({ accountId: a.accountId, amount: a.distributed }));
    const distribution = amount ? [...others, { accountId, amount }] : others;
    return saveMonthPlan(month, { distribution });
  };

  const handleSuggest = async () => {
    const suggestion = suggestDistribution(forecast).filter((s) => s.amount > 0);
    if (suggestion.length === 0) {
      // No se toca el reparto que hubiera: solo se informa
      toast.info(`Tus cuentas ya cubren los gastos de ${name} con lo que les queda de ${prevName}`);
      return;
    }
    await saveMonthPlan(month, { distribution: suggestion });
    toast.success(`Reparto ajustado a lo que necesita cada cuenta en ${name}`);
  };

  const line = (label: string, value: number, opts: { sign?: '+' | '−'; strong?: boolean; tone?: 'default' | 'success' | 'danger' | 'warning' | 'muted' } = {}) => (
    <Typography
      variant="caption"
      component="div"
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
        color: opts.strong ? t.textPrimary : t.textSecondary,
        fontWeight: opts.strong ? 600 : 400,
        ...(opts.strong && { pt: 0.5, mt: 0.25, borderTop: `1px solid ${t.border}` }),
      }}
    >
      <span>{label}</span>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.25 }}>
        {opts.sign && <span>{opts.sign}</span>}
        <MoneyAmount value={value} size="xs" weight={opts.strong ? 700 : 600} tone={opts.tone ?? 'default'} />
      </Box>
    </Typography>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
      <Alert severity="info" icon={<LoginRoundedIcon fontSize="small" />}>
        <strong>Previsión.</strong> {name.charAt(0).toUpperCase() + name.slice(1)} aún no ha empezado: partimos de lo que te
        quedará al acabar {prevName} y le sumamos la nómina del día 1.
      </Alert>

      {/* Resumen del mes previsto */}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.25, sm: 1.5 },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' },
        }}
      >
        <Box sx={{ gridColumn: { xs: 'span 2', md: 'span 2', lg: 'span 2' } }}>
          <SummaryCard
            variant="hero"
            label={`Te quedará a fin de ${name}`}
            value={forecast.end}
            isCurrency
            icon={<AccountBalanceWalletOutlinedIcon />}
            helperText={`Empiezas con ${formatCurrency(forecast.start)} y tienes ${formatCurrency(forecast.expenses)} de gastos`}
          />
        </Box>
        <SummaryCard
          label="Empiezas con"
          value={forecast.start}
          isCurrency
          icon={<LoginRoundedIcon />}
          helperText={`${formatCurrency(forecast.carry)} de ${prevName} + nómina`}
        />
        <SummaryCard
          label="Nómina"
          value={forecast.income}
          isCurrency
          tone="success"
          icon={<PaymentsOutlinedIcon />}
          helperText={forecast.incomeIsEstimate ? 'Estimada: tus ingresos habituales' : `La de ${name}`}
        />
        <Box sx={{ gridColumn: { xs: 'span 2', md: 'auto' }, minWidth: 0 }}>
        <SummaryCard
          label="Gastos del mes"
          value={forecast.expenses}
          isCurrency
          tone="warning"
          icon={<ReceiptLongOutlinedIcon />}
          helperText="Pendientes de pagar"
        />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 2.5 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: hasAccounts ? 'minmax(0, 1fr) minmax(0, 1.4fr)' : 'minmax(0, 1fr)' },
          alignItems: 'start',
        }}
      >
        {/* Nómina y reparto */}
        <SectionCard
          title={`Nómina y reparto de ${name}`}
          subtitle={hasAccounts ? 'Cuánto cobras y cuánto pasas a cada cuenta' : 'Cuánto vas a cobrar este mes'}
          icon={<CallSplitRoundedIcon />}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="label" htmlFor="forecast-income" variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                  Nómina de {name}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: t.textMuted }}>
                  {forecast.incomeIsEstimate ? 'Estimada · cámbiala cuando sepas las guardias' : 'Guardada para este mes'}
                </Typography>
              </Box>
              <AmountField
                id="forecast-income"
                value={forecast.incomeIsEstimate ? undefined : forecast.income}
                placeholder={String(forecast.income).replace('.', ',')}
                onCommit={(value) => saveMonthPlan(month, { income: value ?? null })}
                ariaLabel={`Nómina de ${name}`}
                width={140}
              />
            </Box>

            {hasAccounts && (
              <>
                <Typography variant="overline" sx={{ color: t.textMuted, lineHeight: 1.4, mt: 0.5 }}>
                  Reparto
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {forecast.accounts.map((a) => (
                    <Box key={a.accountId} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                      <Typography
                        component="label"
                        htmlFor={`forecast-share-${a.accountId}`}
                        variant="body2"
                        sx={{ flex: 1, minWidth: 0, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {a.name}
                      </Typography>
                      <AmountField
                        id={`forecast-share-${a.accountId}`}
                        value={a.distributed || undefined}
                        placeholder="0"
                        onCommit={(value) => setShare(a.accountId, value)}
                        ariaLabel={`Reparto a ${a.name}`}
                      />
                    </Box>
                  ))}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: '10px',
                    backgroundColor: forecast.unassigned < 0 ? t.dangerSoft : t.surfaceSoft,
                  }}
                >
                  <Typography variant="body2" sx={{ color: forecast.unassigned < 0 ? t.danger : t.textSecondary, fontWeight: 500 }}>
                    {forecast.unassigned < 0 ? 'Repartes más de lo que cobras' : 'Sin repartir'}
                  </Typography>
                  <MoneyAmount value={forecast.unassigned} size="sm" tone={forecast.unassigned < 0 ? 'danger' : 'default'} />
                </Box>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<AutoFixHighRoundedIcon />}
                  onClick={handleSuggest}
                  sx={{ alignSelf: 'flex-start', color: t.textSecondary }}
                >
                  Repartir para cubrir gastos
                </Button>
              </>
            )}

            {!hasAccounts && (
              <Typography variant="caption" sx={{ color: t.textMuted }}>
                Pon el saldo de tus cuentas en «Tu balance» para repartir la nómina y ver la previsión de cada una.
              </Typography>
            )}
          </Box>
        </SectionCard>

        {/* Previsión por cuenta */}
        {hasAccounts && (
          <SectionCard
            title="Previsión por cuenta"
            subtitle={`Lo que le quedará a cada cuenta al acabar ${name}`}
            icon={<CreditCardOutlinedIcon />}
          >
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(auto-fill, minmax(180px, 1fr))' } }}>
              {forecast.accounts.map((a) => (
                <Box
                  key={a.accountId}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    p: 1.5,
                    borderRadius: '12px',
                    border: `1px solid ${a.end < 0 ? t.danger : t.border}`,
                    backgroundColor: a.end < 0 ? t.dangerSoft : t.surface,
                    minWidth: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </Typography>
                  </Box>
                  {line(`De ${prevName}`, a.carry, { tone: a.carry < 0 ? 'danger' : 'default' })}
                  {line('Reparto', a.distributed, { sign: '+', tone: a.distributed > 0 ? 'success' : 'muted' })}
                  {line('Gastos', a.expenses, { sign: '−', tone: a.expenses > 0 ? 'warning' : 'muted' })}
                  {line(a.end < 0 ? 'Te faltan' : 'Te quedará', Math.abs(a.end), { strong: true, tone: a.end < 0 ? 'danger' : 'success' })}
                </Box>
              ))}
              {forecast.otherExpenses > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1.5, borderRadius: '12px', border: `1px dashed ${t.borderStrong}`, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: t.textMuted, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                      Sin cuenta
                    </Typography>
                  </Box>
                  {line('Gastos', forecast.otherExpenses, { sign: '−', tone: 'warning' })}
                  <Typography variant="caption" sx={{ color: t.textMuted, lineHeight: 1.35 }}>
                    Restan del total. Asígnales una cuenta para verlos en ella.
                  </Typography>
                </Box>
              )}
            </Box>
          </SectionCard>
        )}
      </Box>
    </Box>
  );
}
