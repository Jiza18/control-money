import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import NorthEastRoundedIcon from '@mui/icons-material/NorthEastRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Expense, SavingsGoal, SavingsMovement } from '../db/config';
import { getCurrentBalance } from '../db';
import {
  addSavingsMovement,
  deleteSavingsMovement,
  findGoalExpense,
  getSavingsMovements,
  isExpenseMonthPending,
} from '../db/savingsMovementsService';
import { hasInterest } from '../db/savingsInterest';
import { formatCurrency } from '../utils/formatters';
import { ConfirmDialog, EmptyState, MoneyAmount } from './ui';
import { tokens } from '../theme';
import { useToast } from '../contexts/ToastContext';

type MovementType = SavingsMovement['type'];

const movementLabels: Record<MovementType, string> = {
  deposit: 'Aportación',
  withdrawal: 'Retirada',
  interest: 'Intereses',
};

const toggleLabels: Record<MovementType, string> = {
  deposit: 'Aportar',
  withdrawal: 'Retirar',
  interest: 'Intereses',
};

const savedMessages: Record<MovementType, string> = {
  deposit: 'Aportación registrada',
  withdrawal: 'Retirada registrada',
  interest: 'Intereses registrados',
};

function useMovementColors() {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  return {
    t,
    colorOf: (type: MovementType) =>
      type === 'withdrawal'
        ? { fg: t.danger, bg: t.dangerSoft }
        : type === 'interest'
          ? { fg: t.success, bg: t.successSoft }
          : { fg: t.primary, bg: t.primarySoft },
  };
}

function MovementIcon({ type }: { type: MovementType }) {
  const { colorOf } = useMovementColors();
  const { fg, bg } = colorOf(type);
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: fg,
        backgroundColor: bg,
        '& svg': { fontSize: '1.1rem' },
      }}
    >
      {type === 'withdrawal' ? (
        <NorthEastRoundedIcon />
      ) : type === 'interest' ? (
        <PercentRoundedIcon />
      ) : (
        <SouthWestRoundedIcon />
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Diálogo para registrar un movimiento (aportar, retirar o registrar intereses)

interface MovementDialogProps {
  open: boolean;
  goal: SavingsGoal | null;
  initialType?: MovementType;
  initialAmount?: number;
  initialDate?: Date;
  onClose: () => void;
  onSaved: (goal: SavingsGoal) => void;
}

export function SavingsMovementDialog({
  open,
  goal,
  initialType = 'deposit',
  initialAmount,
  initialDate,
  onClose,
  onSaved,
}: MovementDialogProps) {
  const { t } = useMovementColors();
  const toast = useToast();
  const [type, setType] = useState<MovementType>(initialType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [affectsBalance, setAffectsBalance] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [goalExpense, setGoalExpense] = useState<Expense | null>(null);
  const [markExpensePaid, setMarkExpensePaid] = useState(true);

  useEffect(() => {
    if (!open) return;
    setType(initialType);
    setAmount(initialAmount ? String(initialAmount) : '');
    setDate(initialDate ?? new Date());
    setNote('');
    setAffectsBalance(true);
    setMarkExpensePaid(true);
    setGoalExpense(null);
    if (goal?.id && goal.addToExpenses) {
      findGoalExpense(goal.id)
        .then((e) => setGoalExpense(e ?? null))
        .catch(() => setGoalExpense(null));
    }
    getCurrentBalance()
      .then((b) => setBalance(b ? b.amount : 0))
      .catch(() => setBalance(null));
  }, [open, initialType, initialAmount, initialDate, goal?.id, goal?.addToExpenses]);

  if (!goal) return null;

  const value = Number(amount.replace(',', '.'));
  const valid = value > 0 && Number.isFinite(value);
  const tooMuch = type === 'withdrawal' && valid && value > goal.currentAmount + 0.005;
  const signed = !valid ? 0 : type === 'withdrawal' ? -value : value;
  const touchesBalance = type !== 'interest' && affectsBalance;
  const showInterest = hasInterest(goal) || type === 'interest';
  // Si la meta tiene su aporte en Gastos y ese mes está pendiente, la aportación lo marca como pagado
  const canMarkExpense = type === 'deposit' && goalExpense !== null && isExpenseMonthPending(goalExpense, date);
  const monthName = format(date, 'MMMM', { locale: es });

  const handleSave = async () => {
    if (!valid || tooMuch) return;
    setSaving(true);
    try {
      const updated = await addSavingsMovement(goal, {
        type,
        amount: value,
        date,
        note: note.trim() || undefined,
        affectsBalance: touchesBalance,
        expenseId: canMarkExpense && markExpensePaid ? goalExpense!.id : undefined,
      });
      toast.success(savedMessages[type]);
      onSaved(updated);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const summaryRow = (label: string, from: number, to: number) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
      <Typography variant="body2" sx={{ color: t.textSecondary }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <MoneyAmount value={from} size="sm" tone="muted" weight={500} />
        <Box component="span" sx={{ color: t.textMuted }}>→</Box>
        <MoneyAmount value={to} size="sm" tone={to < 0 ? 'danger' : 'default'} />
      </Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            {movementLabels[type]}
            <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal.name}
            </Typography>
          </Box>
          <IconButton aria-label="Cerrar" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={type}
            onChange={(_, v) => v && setType(v)}
            aria-label="Tipo de movimiento"
            sx={{ '& .MuiToggleButton-root': { minHeight: 36 } }}
          >
            {(['deposit', 'withdrawal', ...(showInterest ? ['interest'] : [])] as MovementType[]).map((k) => (
              <ToggleButton key={k} value={k}>
                {toggleLabels[k]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <TextField
            label="Importe"
            autoFocus
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={tooMuch}
            helperText={tooMuch ? `Solo tienes ${formatCurrency(goal.currentAmount)} en esta meta` : undefined}
            inputProps={{ inputMode: 'decimal', style: { fontSize: '1.25rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' } }}
            InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
          />

          {type === 'deposit' && goal.monthlyContribution > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: -0.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => setAmount(String(goal.monthlyContribution))}
                sx={{ color: t.textSecondary, fontWeight: 500 }}
              >
                Aporte mensual · {formatCurrency(goal.monthlyContribution)}
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha"
                value={date}
                onChange={(d) => setDate(d || new Date())}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
            <TextField label="Nota (opcional)" fullWidth value={note} onChange={(e) => setNote(e.target.value)} />
          </Box>

          {type === 'interest' ? (
            <Typography variant="caption" sx={{ color: t.textMuted, mt: -0.5 }}>
              Los intereses los abona el banco: suman a la meta y no cambian tu saldo actual. Si el banco te
              abonó otra cifra, corrige el importe.
            </Typography>
          ) : (
            <FormControlLabel
              control={<Checkbox checked={affectsBalance} onChange={(e) => setAffectsBalance(e.target.checked)} />}
              label={
                <Typography variant="body2" sx={{ color: t.textPrimary }}>
                  {type === 'deposit' ? 'Descontar de mi saldo actual' : 'Devolver a mi saldo actual'}
                </Typography>
              }
              sx={{ mx: 0, px: 1, py: 0.25, borderRadius: '10px', border: `1px solid ${t.border}` }}
            />
          )}

          {canMarkExpense && (
            <FormControlLabel
              control={<Checkbox checked={markExpensePaid} onChange={(e) => setMarkExpensePaid(e.target.checked)} />}
              label={
                <Typography variant="body2" sx={{ color: t.textPrimary }}>
                  Marcar como pagado el aporte de {monthName} en Gastos
                </Typography>
              }
              sx={{ mx: 0, mt: -1, px: 1, py: 0.25, borderRadius: '10px', border: `1px solid ${t.border}` }}
            />
          )}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              p: 1.5,
              borderRadius: '10px',
              backgroundColor: t.surfaceSoft,
            }}
          >
            {summaryRow('Meta', goal.currentAmount, goal.currentAmount + signed)}
            {touchesBalance && balance !== null && summaryRow('Saldo actual', balance, balance - signed)}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!valid || tooMuch || saving}>
            {type === 'deposit' ? 'Aportar' : type === 'withdrawal' ? 'Retirar' : 'Registrar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Historial de movimientos de una meta

interface HistoryDialogProps {
  open: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onNewMovement: () => void;
  onChanged: (goal: SavingsGoal) => void;
}

export function SavingsHistoryDialog({ open, goal, onClose, onNewMovement, onChanged }: HistoryDialogProps) {
  const { t, colorOf } = useMovementColors();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [movements, setMovements] = useState<SavingsMovement[] | null>(null);
  const [toDelete, setToDelete] = useState<SavingsMovement | null>(null);

  const goalId = goal?.id;
  const currentAmount = goal?.currentAmount;

  useEffect(() => {
    if (!open || !goalId) return;
    setMovements(null);
    getSavingsMovements(goalId)
      .then(setMovements)
      .catch(() => setMovements([]));
  }, [open, goalId, currentAmount]);

  const totals = useMemo(() => {
    const sum = (type: MovementType) =>
      (movements ?? []).filter((m) => m.type === type).reduce((s, m) => s + m.amount, 0);
    return { deposit: sum('deposit'), withdrawal: sum('withdrawal'), interest: sum('interest') };
  }, [movements]);

  if (!goal) return null;

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      const updated = await deleteSavingsMovement(goal, toDelete);
      toast.success('Movimiento deshecho');
      onChanged(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo deshacer el movimiento');
    }
    setToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            Movimientos
            <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.25 }}>
              {goal.name} · <MoneyAmount value={goal.currentAmount} size="sm" weight={600} />
            </Typography>
          </Box>
          <IconButton aria-label="Cerrar" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: '8px !important' }}>
          {movements && movements.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 2 }}>
              {(['deposit', 'withdrawal', 'interest'] as MovementType[]).map((k) => (
                <Box key={k} sx={{ p: 1.25, borderRadius: '10px', backgroundColor: t.surfaceSoft, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', color: t.textMuted }}>
                    {k === 'deposit' ? 'Aportado' : k === 'withdrawal' ? 'Retirado' : 'Intereses'}
                  </Typography>
                  <MoneyAmount value={totals[k]} size="sm" />
                </Box>
              ))}
            </Box>
          )}

          {movements === null ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: '10px' }} />
              ))}
            </Box>
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<HistoryRoundedIcon />}
              title="Sin movimientos todavía"
              description="Las aportaciones, retiradas e intereses que registres aparecerán aquí."
            />
          ) : (
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {movements.map((m) => {
                const { fg } = colorOf(m.type);
                return (
                  <Box
                    component="li"
                    key={m.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1.25,
                      borderBottom: `1px solid ${t.border}`,
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <MovementIcon type={m.type} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                        {movementLabels[m.type]}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {format(new Date(m.date), 'd MMM yyyy', { locale: es })}
                        {m.affectsBalance && (m.type === 'deposit' ? ' · del saldo actual' : ' · al saldo actual')}
                        {m.note ? ` · ${m.note}` : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ color: m.type === 'withdrawal' ? t.danger : fg, flexShrink: 0 }}>
                      <MoneyAmount value={m.type === 'withdrawal' ? -m.amount : m.amount} size="sm" tone="inherit" />
                    </Box>
                    <Tooltip title="Deshacer movimiento">
                      <IconButton
                        aria-label={`Deshacer ${movementLabels[m.type].toLowerCase()} del ${format(new Date(m.date), 'd MMM yyyy', { locale: es })}`}
                        onClick={() => setToDelete(m)}
                        sx={{ width: 36, height: 36, mr: -0.75, '&:hover': { color: t.danger, backgroundColor: t.dangerSoft } }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Cerrar
          </Button>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onNewMovement}>
            Nuevo movimiento
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Deshacer movimiento"
        description={
          toDelete
            ? `Se quitará ${movementLabels[toDelete.type].toLowerCase()} de ${formatCurrency(toDelete.amount)} y se ajustará el saldo de la meta${toDelete.affectsBalance ? ' y tu saldo actual' : ''}.`
            : undefined
        }
        confirmLabel="Deshacer"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
        destructive
      />
    </>
  );
}
