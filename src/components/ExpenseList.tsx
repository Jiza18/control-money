import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  IconButton,
  Stack,
  Checkbox,
  InputBase,
  Chip,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Skeleton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TableChartIcon from '@mui/icons-material/TableChart';
import { format, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Expense, PaymentRecord } from '../db/config';
import { getExpensesByMonth, deleteExpense, getCurrentBalance, updateExpense } from '../db';
import {
  SummaryCard,
  CategoryChip,
  FrequencyChip,
  StatusChip,
  AccountChip,
  EmptyState,
  ConfirmDialog,
  SwipeableCard,
} from './ui';
import { tokens } from '../theme';
import { getAllBudgets } from '../db/budgetServices';
import { getAllAccounts } from '../db/accountsService';
import { CategoryBudget, Account } from '../db/config';
import { useToast } from '../contexts/ToastContext';

interface ExpenseListProps {
  currentMonth: Date;
  onEditExpense: (expense: Expense) => void;
  onExpenseDeleted: () => void;
  onMonthChange: (month: Date) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

export default function ExpenseList({
  currentMonth,
  onEditExpense,
  onExpenseDeleted,
  onMonthChange,
}: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | 'none' | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'description',
    direction: 'asc',
  });
  const [balance, setBalance] = useState<{ amount: number; monthlyIncome: number } | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const accountsById = new Map<number, Account>(
    accounts.filter((a): a is Account & { id: number } => a.id != null).map((a) => [a.id, a])
  );

  const toast = useToast();
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];
  const isMobile = useMediaQuery('(max-width:900px)');

  const calculateBalances = (
    currentBalance: { amount: number; monthlyIncome: number } | null
  ) => {
    if (!currentBalance) return { realBalance: 0, projectedBalance: 0 };

    const pendingExpenses = expenses.reduce((sum, expense) => {
      const currentMonthPayment = expense.paymentHistory?.find((record) =>
        isSameMonth(new Date(record.date), currentMonth)
      );
      return !currentMonthPayment?.isPaid ? sum + expense.amount : sum;
    }, 0);

    const totalMonthExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const realBalance =
      currentBalance.amount -
      (isSameMonth(currentMonth, new Date()) ? pendingExpenses : 0);

    const projectedBalance = isSameMonth(currentMonth, new Date())
      ? realBalance
      : currentBalance.monthlyIncome - totalMonthExpenses;

    return { realBalance, projectedBalance };
  };

  const matchesAccountFilter = (expense: Expense) => {
    if (selectedAccount === null) return true;
    const bucket =
      expense.accountId != null && accountsById.has(expense.accountId)
        ? expense.accountId
        : 'none';
    return bucket === selectedAccount;
  };

  const filteredTotal = expenses
    .filter((expense) => {
      const matchesCategory =
        selectedCategory === null || expense.category === selectedCategory;
      const matchesSearch =
        searchText === '' ||
        expense.description.toLowerCase().includes(searchText.toLowerCase());
      return matchesCategory && matchesSearch && matchesAccountFilter(expense);
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const loadBalance = useCallback(async () => {
    try {
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const monthExpenses = await getExpensesByMonth(currentMonth);
      setExpenses(monthExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  const loadBudgets = useCallback(async () => {
    try {
      const all = await getAllBudgets();
      setBudgets(all);
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const all = await getAllAccounts();
      setAccounts(all);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      loadExpenses();
      loadBalance();
    };
    window.addEventListener('dbTypeChanged', handler as EventListener);
    return () => window.removeEventListener('dbTypeChanged', handler as EventListener);
  }, [loadExpenses, loadBalance]);

  // Al cambiar de mes limpiamos el filtro por cuenta para no quedar
  // atascados en una cuenta que no tiene gastos en el mes seleccionado.
  useEffect(() => {
    setSelectedAccount(null);
  }, [currentMonth]);

  const handleDelete = (id: number) => {
    setConfirmState({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    if (confirmState.id !== null) {
      try {
        await deleteExpense(confirmState.id);
        await loadExpenses();
        onExpenseDeleted();
        toast.success('Gasto eliminado');
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
    setConfirmState({ open: false, id: null });
  };

  // --- Edición de importe (con alcance para gastos recurrentes) ---
  const [amountEdit, setAmountEdit] = useState<{
    open: boolean;
    expense: Expense | null;
    value: string;
    scope: 'month' | 'forward';
  }>({ open: false, expense: null, value: '', scope: 'month' });

  const openAmountEdit = (expense: Expense) => {
    setAmountEdit({
      open: true,
      expense,
      value: String(expense.amount),
      scope: 'month',
    });
  };

  const buildAmountUpdate = (
    expense: Expense,
    newAmount: number,
    scope: 'month' | 'forward'
  ): Expense => {
    const history: PaymentRecord[] = (expense.paymentHistory || []).map((r) => ({ ...r }));
    const curKey = currentMonth.getFullYear() * 12 + currentMonth.getMonth();

    // Fija el importe del mes actual, preservando su estado de pago
    const upsertMonth = (arr: PaymentRecord[]) => {
      const idx = arr.findIndex((r) => isSameMonth(new Date(r.date), currentMonth));
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], amount: newAmount };
      } else {
        arr.push({ date: currentMonth, isPaid: false, amount: newAmount });
      }
      return arr;
    };

    // Gastos puntuales: no hay "meses siguientes", solo cambia el importe
    if (expense.frequency === 'one-time') {
      return { ...expense, amount: newAmount, paymentHistory: upsertMonth(history) };
    }

    if (scope === 'month') {
      // Solo este mes: no tocamos el importe base ni los meses futuros
      return { ...expense, paymentHistory: upsertMonth(history) };
    }

    // Este mes y los siguientes: importe base + registros de este mes en adelante
    const forward = history.map((r) => {
      const d = new Date(r.date);
      const k = d.getFullYear() * 12 + d.getMonth();
      return k >= curKey ? { ...r, amount: newAmount } : r;
    });
    return { ...expense, amount: newAmount, paymentHistory: upsertMonth(forward) };
  };

  const handleAmountSave = async (scope: 'month' | 'forward') => {
    const exp = amountEdit.expense;
    const newAmount = parseFloat(amountEdit.value);
    setAmountEdit((s) => ({ ...s, open: false }));

    if (!exp?.id || isNaN(newAmount)) return;

    const updated = buildAmountUpdate(exp, newAmount, scope);
    try {
      // Actualización optimista: la fila del mes actual muestra el nuevo importe
      setExpenses((prev) =>
        prev.map((e) => (e.id === exp.id ? { ...updated, amount: newAmount } : e))
      );
      await updateExpense(updated);
    } catch (error) {
      console.error('Error updating expense amount:', error);
      await loadExpenses();
    }
  };

  const handlePaymentToggle = async (expense: Expense) => {
    if (!expense.id) return;
    try {
      const existingPaymentForMonth = expense.paymentHistory?.find((record) =>
        isSameMonth(new Date(record.date), currentMonth)
      );

      const updatedPaymentHistory = [...(expense.paymentHistory || [])];
      const newPaymentStatus = existingPaymentForMonth
        ? !existingPaymentForMonth.isPaid
        : true;

      if (existingPaymentForMonth) {
        const index = updatedPaymentHistory.findIndex((record) =>
          isSameMonth(new Date(record.date), currentMonth)
        );
        updatedPaymentHistory[index] = {
          date: currentMonth,
          isPaid: newPaymentStatus,
          amount: existingPaymentForMonth.amount || expense.amount,
        };
      } else {
        updatedPaymentHistory.push({
          date: currentMonth,
          isPaid: newPaymentStatus,
          amount: expense.amount,
        });
      }

      const updatedExpense = {
        ...expense,
        isPaid:
          expense.frequency === 'one-time' ? newPaymentStatus : expense.isPaid,
        paymentHistory: updatedPaymentHistory,
      };
      // Actualización optimista en memoria: evita recargar toda la tabla
      // (que mostraba los skeletons y resultaba molesto) al marcar/desmarcar.
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? { ...e, ...updatedExpense } : e))
      );
      await updateExpense(updatedExpense);
    } catch (error) {
      console.error('Error updating expense payment status:', error);
      // Si falla la persistencia, recargamos para revertir el cambio optimista
      await loadExpenses();
    }
  };

  useEffect(() => {
    const updateData = async () => {
      await loadExpenses();
      await loadBalance();
      await loadBudgets();
      await loadAccounts();
    };
    updateData();

    const handleExpenseChange = () => {
      updateData();
    };

    document.addEventListener('expenseAdded', handleExpenseChange);
    return () => {
      document.removeEventListener('expenseAdded', handleExpenseChange);
    };
  }, [currentMonth, loadExpenses, loadBalance, loadBudgets, loadAccounts]);

  // Computed values for summary cards
  const totalMonth = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidMonth = expenses.reduce((sum, e) => {
    const ph = e.paymentHistory?.find((record) =>
      isSameMonth(new Date(record.date), currentMonth)
    );
    return ph?.isPaid ? sum + e.amount : sum;
  }, 0);
  const pendingMonth = totalMonth - paidMonth;
  const balances = balance ? calculateBalances(balance) : { realBalance: 0, projectedBalance: 0 };

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesCategory =
        selectedCategory === null || expense.category === selectedCategory;
      const matchesSearch =
        searchText === '' ||
        expense.description.toLowerCase().includes(searchText.toLowerCase());
      return matchesCategory && matchesSearch && matchesAccountFilter(expense);
    })
    .sort((a, b) => {
      const currentMonthPaymentA = a.paymentHistory?.find((record) =>
        isSameMonth(new Date(record.date), currentMonth)
      );
      const currentMonthPaymentB = b.paymentHistory?.find((record) =>
        isSameMonth(new Date(record.date), currentMonth)
      );
      const isPaidA = currentMonthPaymentA?.isPaid || false;
      const isPaidB = currentMonthPaymentB?.isPaid || false;

      switch (sortConfig.key) {
        case 'description':
          return sortConfig.direction === 'asc'
            ? a.description.localeCompare(b.description)
            : b.description.localeCompare(a.description);
        case 'date':
          return sortConfig.direction === 'asc'
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'status':
          if (isPaidA === isPaidB) return 0;
          return sortConfig.direction === 'asc'
            ? isPaidA ? 1 : -1
            : isPaidA ? -1 : 1;
        default:
          return 0;
      }
    });

  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  // Gasto agrupado por cuenta para el mes actual (incluye bucket "Sin cuenta")
  const accountBuckets = (() => {
    type Agg = { total: number; paid: number };
    const totals = new Map<number | 'none', Agg>();
    let hasNone = false;
    for (const e of expenses) {
      const key =
        e.accountId != null && accountsById.has(e.accountId) ? e.accountId : 'none';
      if (key === 'none') hasNone = true;
      const ph = e.paymentHistory?.find((record) =>
        isSameMonth(new Date(record.date), currentMonth)
      );
      const agg = totals.get(key) || { total: 0, paid: 0 };
      agg.total += e.amount;
      if (ph?.isPaid) agg.paid += e.amount;
      totals.set(key, agg);
    }
    const toBucket = (
      key: number | 'none',
      name: string,
      color: string,
      agg: Agg
    ) => ({ key, name, color, total: agg.total, paid: agg.paid, pending: agg.total - agg.paid });

    const buckets: ReturnType<typeof toBucket>[] = [];
    for (const acc of accounts) {
      if (acc.id != null && totals.has(acc.id)) {
        buckets.push(toBucket(acc.id, acc.name, acc.color, totals.get(acc.id)!));
      }
    }
    if (hasNone) {
      buckets.push(toBucket('none', 'Sin cuenta', '#94A3B8', totals.get('none')!));
    }
    return buckets;
  })();

  return (
    <Box data-testid="expense-list">
      {/* Month navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          mb: 2,
        }}
      >
        <IconButton
          size="small"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          sx={{ color: t.textSecondary }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, minWidth: 160, textAlign: 'center', fontSize: '1rem' }}
        >
          {format(currentMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          sx={{ color: t.textSecondary }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        {(
          [
            { label: 'Total gastos', value: totalMonth, tone: 'default' },
            { label: 'Pagados', value: paidMonth, tone: 'success' },
            { label: 'Pendientes', value: pendingMonth, tone: 'danger' },
            { label: 'Balance real', value: balances.realBalance, tone: balances.realBalance >= 0 ? 'success' : 'danger' },
            { label: 'Proyectado', value: balances.projectedBalance, tone: balances.projectedBalance >= 0 ? 'success' : 'danger' },
          ] as const
        ).map((card) => (
          <Box key={card.label} sx={{ flex: '1 1 130px', minWidth: 0 }}>
            <SummaryCard label={card.label} value={card.value} isCurrency tone={card.tone} />
          </Box>
        ))}
      </Box>

      {/* Gasto por cuenta (clic para filtrar) */}
      {accounts.length > 0 && accountBuckets.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{ color: t.textSecondary, fontWeight: 700, display: 'block', mb: 0.75 }}
          >
            Por cuenta
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 0.5,
              WebkitOverflowScrolling: 'touch',
              '& > *': { flex: '0 0 auto' },
            }}
          >
            {accountBuckets.map((b) => {
              const isSelected = selectedAccount === b.key;
              return (
                <Box
                  key={String(b.key)}
                  onClick={() => setSelectedAccount(isSelected ? null : b.key)}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.25,
                    px: 1.25,
                    py: 0.75,
                    minWidth: 96,
                    borderRadius: '12px',
                    border: `1px solid ${isSelected ? b.color : t.border}`,
                    backgroundColor: isSelected ? `${b.color}1F` : t.surface,
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: b.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap' }}
                    >
                      {b.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: t.textPrimary }}>
                    {formatCurrency(b.total)}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.25 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: t.success, fontWeight: 600, fontSize: '0.65rem', whiteSpace: 'nowrap', lineHeight: 1.4 }}
                    >
                      Pagado {formatCurrency(b.paid)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: t.danger, fontWeight: 600, fontSize: '0.65rem', whiteSpace: 'nowrap', lineHeight: 1.4 }}
                    >
                      Pend. {formatCurrency(b.pending)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Search and filter */}
      <Box sx={{ mb: 2 }}>
        {/* Search bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            mb: 1.5,
          }}
        >
          <SearchIcon sx={{ color: t.textMuted, fontSize: '1.1rem' }} />
          <InputBase
            fullWidth
            placeholder="Buscar por descripción…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ fontSize: '0.875rem', color: t.textPrimary }}
          />
          {searchText && (
            <IconButton size="small" onClick={() => setSearchText('')} sx={{ p: 0.25 }}>
              <ClearIcon sx={{ fontSize: '1rem', color: t.textMuted }} />
            </IconButton>
          )}
        </Box>

        {/* Category chips with budget progress */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            pb: 0.5,
            flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            '& > *': { flex: '0 0 auto' },
          }}
        >
          <Chip
            label="Todas"
            size="small"
            onClick={() => setSelectedCategory(null)}
            variant={selectedCategory === null ? 'filled' : 'outlined'}
            color={selectedCategory === null ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
          {categories.map((category) => {
            const budgetForCategory = budgets.find((b) => b.category === category);
            const categoryTotal = expenses
              .filter((e) => e.category === category)
              .reduce((s, e) => s + e.amount, 0);
            const hasBudget =
              budgetForCategory && budgetForCategory.monthlyBudget > 0;
            const progressPct = hasBudget
              ? Math.min((categoryTotal / budgetForCategory.monthlyBudget) * 100, 100)
              : 0;
            const isOver = hasBudget && categoryTotal > budgetForCategory.monthlyBudget;

            return (
              <Box key={category} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Chip
                  label={category}
                  size="small"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === category ? null : category)
                  }
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  sx={{ fontWeight: 500 }}
                />
                {hasBudget && (
                  <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{
                      height: 3,
                      borderRadius: 2,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: isOver ? '#ef4444' : '#10b981',
                      },
                      backgroundColor: t.border,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {(searchText || selectedAccount !== null) && (
          <Typography variant="caption" sx={{ color: t.textSecondary, mt: 0.5, display: 'block' }}>
            Filtrado: {formatCurrency(filteredTotal)}
          </Typography>
        )}
      </Box>

      {/* Mobile cards / Desktop table */}
      {isMobile ? (
        <Box>
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={90}
                  sx={{ borderRadius: 3, mb: 1 }}
                />
              ))}
            </>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<TableChartIcon />}
              title="No hay gastos este mes"
              description="Pulsa el botón + para añadir un gasto"
            />
          ) : (
            filteredExpenses.map((expense) => {
              const currentMonthPayment = expense.paymentHistory?.find((record) =>
                isSameMonth(new Date(record.date), currentMonth)
              );
              const isPaidInCurrentMonth = currentMonthPayment?.isPaid || false;

              return (
                <SwipeableCard
                  key={expense.id}
                  onDelete={() => setConfirmState({ open: true, id: expense.id! })}
                  disabled={false}
                >
                  <Card
                    variant="outlined"
                    sx={{ mb: 0, borderRadius: '20px', border: `1px solid ${t.border}` }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Header row */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: t.textPrimary, flex: 1, pr: 1 }}
                        >
                          {expense.description}
                        </Typography>
                        <Typography
                          variant="body2"
                          onClick={() => expense.id && openAmountEdit(expense)}
                          sx={{
                            fontWeight: 700,
                            color: t.textPrimary,
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            borderBottom: `1px dashed ${t.border}`,
                          }}
                        >
                          {formatCurrency(expense.amount)}
                        </Typography>
                      </Box>

                      {/* Chips row */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                        <CategoryChip category={expense.category} />
                        <FrequencyChip frequency={expense.frequency} />
                        {expense.accountId != null && accountsById.get(expense.accountId) && (
                          <AccountChip
                            name={accountsById.get(expense.accountId)!.name}
                            color={accountsById.get(expense.accountId)!.color}
                          />
                        )}
                        <Chip
                          size="small"
                          label={format(new Date(expense.date), 'dd/MM/yyyy')}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            backgroundColor: t.surfaceSoft,
                            color: t.textSecondary,
                            border: `1px solid ${t.border}`,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      </Box>

                      <Divider sx={{ my: 1, borderColor: t.border }} />

                      {/* Footer row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox
                            checked={isPaidInCurrentMonth}
                            onChange={() => handlePaymentToggle(expense)}
                            size="small"
                            sx={{ p: 0.25 }}
                          />
                          <StatusChip status={isPaidInCurrentMonth ? 'paid' : 'pending'} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.25 }}>
                          <IconButton
                            size="small"
                            onClick={() => expense.id && onEditExpense(expense)}
                            sx={{ color: t.textSecondary }}
                          >
                            <EditIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => expense.id && handleDelete(expense.id)}
                            sx={{ color: t.danger }}
                          >
                            <DeleteIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </SwipeableCard>
              );
            })
          )}
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: t.surfaceSoft }}>
                <TableCell
                  sx={{ fontWeight: 700, cursor: 'pointer', color: t.textSecondary, fontSize: '0.8rem' }}
                  onClick={() =>
                    setSortConfig({
                      key: 'description',
                      direction:
                        sortConfig.key === 'description' && sortConfig.direction === 'asc'
                          ? 'desc'
                          : 'asc',
                    })
                  }
                >
                  Descripción {sortConfig.key === 'description' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                  Cantidad
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                  Categoría
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, cursor: 'pointer', color: t.textSecondary, fontSize: '0.8rem' }}
                  onClick={() =>
                    setSortConfig({
                      key: 'date',
                      direction:
                        sortConfig.key === 'date' && sortConfig.direction === 'asc'
                          ? 'desc'
                          : 'asc',
                    })
                  }
                >
                  Fecha {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                  Frecuencia
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, cursor: 'pointer', color: t.textSecondary, fontSize: '0.8rem' }}
                  onClick={() =>
                    setSortConfig({
                      key: 'status',
                      direction:
                        sortConfig.key === 'status' && sortConfig.direction === 'asc'
                          ? 'desc'
                          : 'asc',
                    })
                  }
                >
                  Estado {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                    <EmptyState
                      icon={<TableChartIcon />}
                      title="No hay gastos este mes"
                      description="Pulsa el botón + para añadir un gasto"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const currentMonthPayment = expense.paymentHistory?.find((record) =>
                    isSameMonth(new Date(record.date), currentMonth)
                  );
                  const isPaidInCurrentMonth = currentMonthPayment?.isPaid || false;

                  return (
                    <TableRow
                      key={expense.id}
                      sx={{
                        '&:hover td': { backgroundColor: t.surfaceSoft },
                        transition: 'background 0.1s',
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{expense.description}</TableCell>
                      <TableCell align="right">
                        <Box
                          onClick={() => expense.id && openAmountEdit(expense)}
                          title="Editar importe"
                          sx={{
                            cursor: 'pointer',
                            display: 'inline-block',
                            borderBottom: `1px dashed ${t.border}`,
                          }}
                        >
                          {formatCurrency(expense.amount)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                          <CategoryChip category={expense.category} />
                          {expense.accountId != null && accountsById.get(expense.accountId) && (
                            <AccountChip
                              name={accountsById.get(expense.accountId)!.name}
                              color={accountsById.get(expense.accountId)!.color}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: t.textSecondary, fontSize: '0.85rem' }}>
                        {format(new Date(expense.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <FrequencyChip frequency={expense.frequency} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox
                            checked={isPaidInCurrentMonth}
                            onChange={() => handlePaymentToggle(expense)}
                            size="small"
                            sx={{ p: 0.25 }}
                          />
                          <StatusChip status={isPaidInCurrentMonth ? 'paid' : 'pending'} />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => expense.id && onEditExpense(expense)}
                            sx={{ color: t.primary }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => expense.id && handleDelete(expense.id)}
                            sx={{ color: t.danger }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ backgroundColor: t.surfaceSoft }}>
                <TableCell sx={{ fontWeight: 700, color: t.textSecondary }}>
                  Total Filtrado
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(filteredTotal)}
                </TableCell>
                <TableCell colSpan={5} />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo de edición de importe */}
      <Dialog
        open={amountEdit.open}
        onClose={() => setAmountEdit((s) => ({ ...s, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Editar importe</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {amountEdit.expense && (
            <Typography variant="body2" sx={{ color: t.textSecondary }}>
              {amountEdit.expense.description}
            </Typography>
          )}
          <TextField
            label="Importe"
            type="number"
            value={amountEdit.value}
            onChange={(e) => setAmountEdit((s) => ({ ...s, value: e.target.value }))}
            autoFocus
            fullWidth
            inputProps={{ step: '0.01' }}
            InputProps={{ endAdornment: <Typography sx={{ color: t.textSecondary }}>€</Typography> }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAmountSave(amountEdit.scope);
              }
            }}
          />

          {amountEdit.expense && amountEdit.expense.frequency !== 'one-time' && (
            <Box>
              <Typography variant="caption" sx={{ color: t.textSecondary, fontWeight: 600 }}>
                ¿A qué meses aplicar el nuevo importe?
              </Typography>
              <RadioGroup
                value={amountEdit.scope}
                onChange={(e) =>
                  setAmountEdit((s) => ({ ...s, scope: e.target.value as 'month' | 'forward' }))
                }
              >
                <FormControlLabel
                  value="month"
                  control={<Radio size="small" />}
                  label="Solo este mes"
                />
                <FormControlLabel
                  value="forward"
                  control={<Radio size="small" />}
                  label="Este mes y los siguientes"
                />
              </RadioGroup>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAmountEdit((s) => ({ ...s, open: false }))}
            variant="outlined"
            sx={{ borderRadius: '12px' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleAmountSave(amountEdit.scope)}
            variant="contained"
            color="primary"
            sx={{ borderRadius: '12px' }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        title="Eliminar gasto"
        description="¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmState({ open: false, id: null })}
        destructive
      />
    </Box>
  );
}
