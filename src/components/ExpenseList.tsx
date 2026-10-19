import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TableSortLabel,
  IconButton,
  Checkbox,
  Chip,
  useMediaQuery,
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
  InputAdornment,
  Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import DonutLargeRoundedIcon from '@mui/icons-material/DonutLargeRounded';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { format, isSameMonth } from 'date-fns';
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
  SectionCard,
  MoneyAmount,
} from './ui';
import { tokens, getCategoryColor } from '../theme';
import { formatCurrency } from '../utils/formatters';
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

// Icono de cada categoría de gasto (avatar de las filas)
const categoryIcons: Record<string, ReactNode> = {
  'Préstamos': <AccountBalanceOutlinedIcon />,
  'Gastos Fijos': <HomeOutlinedIcon />,
  'Comida': <RestaurantOutlinedIcon />,
  'Transporte': <DirectionsCarOutlinedIcon />,
  'Entretenimiento': <MovieOutlinedIcon />,
  'Salud': <FavoriteBorderRoundedIcon />,
  'Otros': <CategoryOutlinedIcon />,
};

function CategoryAvatar({ category, size = 40 }: { category: string; size?: number }) {
  const theme = useTheme();
  const color = getCategoryColor(category, theme.palette.mode);
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size >= 40 ? '11px' : '9px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        backgroundColor: alpha(color, theme.palette.mode === 'light' ? 0.1 : 0.16),
        '& svg': { fontSize: size >= 40 ? '1.25rem' : '1.05rem' },
      }}
    >
      {categoryIcons[category] ?? categoryIcons['Otros']}
    </Box>
  );
}

export default function ExpenseList({
  currentMonth,
  onEditExpense,
  onExpenseDeleted,
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
      loadAccounts();
    };
    window.addEventListener('dbTypeChanged', handler as EventListener);
    return () => window.removeEventListener('dbTypeChanged', handler as EventListener);
  }, [loadExpenses, loadBalance, loadAccounts]);

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
      buckets.push(toBucket('none', 'Sin cuenta', t.textMuted, totals.get('none')!));
    }
    return buckets;
  })();

  // --- Valores derivados solo para presentación ---
  const isPaidThisMonth = (expense: Expense) =>
    Boolean(
      expense.paymentHistory?.find((record) => isSameMonth(new Date(record.date), currentMonth))
        ?.isPaid
    );
  const paidCount = expenses.filter(isPaidThisMonth).length;
  const pendingCount = expenses.length - paidCount;
  const paidPct = totalMonth > 0 ? Math.round((paidMonth / totalMonth) * 100) : 0;
  const isCurrentMonthView = isSameMonth(currentMonth, new Date());

  const budgetRows = categories
    .map((category) => {
      const budgetForCategory = budgets.find((b) => b.category === category);
      const categoryTotal = expenses
        .filter((e) => e.category === category)
        .reduce((s, e) => s + e.amount, 0);
      const limit = budgetForCategory?.monthlyBudget ?? 0;
      return {
        category,
        spent: categoryTotal,
        limit,
        pct: limit > 0 ? Math.min((categoryTotal / limit) * 100, 100) : 0,
        isOver: limit > 0 && categoryTotal > limit,
      };
    })
    .filter((row) => row.limit > 0);

  const showAccounts = accounts.length > 0 && accountBuckets.length > 0;
  const showBudgets = budgetRows.length > 0;
  const hasFilters = selectedCategory !== null || selectedAccount !== null || searchText !== '';

  const toggleSort = (key: string) =>
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });

  const formatDay = (date: Date) => format(new Date(date), 'dd MMM yyyy', { locale: es });

  const getAccount = (expense: Expense) =>
    expense.accountId != null ? accountsById.get(expense.accountId) : undefined;

  const amountButton = (expense: Expense, size: 'sm' | 'md') => (
    <Tooltip title="Editar importe">
      <Box
        component="button"
        type="button"
        onClick={() => expense.id && openAmountEdit(expense)}
        aria-label={`Editar importe de ${expense.description}`}
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          px: 0.75,
          mx: -0.75,
          py: 0.25,
          borderRadius: '6px',
          transition: 'background-color .15s',
          '&:hover': { backgroundColor: t.surfaceSoft },
          '&:focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 1 },
        }}
      >
        <MoneyAmount value={expense.amount} size={size} weight={600} />
      </Box>
    </Tooltip>
  );

  const paidToggle = (expense: Expense, isPaid: boolean) => (
    <Box
      component="label"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', ml: -0.75 }}
    >
      <Checkbox
        checked={isPaid}
        onChange={() => handlePaymentToggle(expense)}
        size="small"
        color="success"
        inputProps={{ 'aria-label': isPaid ? 'Marcar como pendiente' : 'Marcar como pagado' }}
      />
      <StatusChip status={isPaid ? 'paid' : 'pending'} />
    </Box>
  );

  const rowActions = (expense: Expense) => (
    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
      <Tooltip title="Editar gasto">
        <IconButton
          onClick={() => expense.id && onEditExpense(expense)}
          aria-label={`Editar ${expense.description}`}
          sx={{ width: 36, height: 36 }}
        >
          <EditOutlinedIcon sx={{ fontSize: '1.15rem' }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar gasto">
        <IconButton
          onClick={() => expense.id && handleDelete(expense.id)}
          aria-label={`Eliminar ${expense.description}`}
          sx={{
            width: 36,
            height: 36,
            '&:hover': { color: t.danger, backgroundColor: t.dangerSoft },
          }}
        >
          <DeleteOutlineRoundedIcon sx={{ fontSize: '1.15rem' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const filterChip = (key: string, label: string, selected: boolean, onClick: () => void) => (
    <Chip
      key={key}
      label={label}
      onClick={onClick}
      variant={selected ? 'filled' : 'outlined'}
      color={selected ? 'primary' : 'default'}
      sx={{
        height: 32,
        fontWeight: selected ? 600 : 500,
        ...(selected ? {} : { color: t.textSecondary }),
      }}
    />
  );

  const emptyState = (
    <EmptyState
      icon={<ReceiptLongOutlinedIcon />}
      title={hasFilters ? 'Ningún gasto coincide con el filtro' : 'No hay gastos este mes'}
      description={
        hasFilters
          ? 'Prueba con otra búsqueda o quita los filtros activos.'
          : 'Pulsa el botón + para añadir un gasto o escanear un ticket.'
      }
    />
  );

  return (
    <Box data-testid="expense-list" sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 } }}>
      {/* Summary cards */}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.25, sm: 1.5 },
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' },
        }}
      >
        <Box sx={{ gridColumn: { xs: 'span 2', md: 'span 2', lg: 'span 2' } }}>
          <SummaryCard
            variant="hero"
            label="Balance real"
            value={balances.realBalance}
            isCurrency
            icon={<AccountBalanceWalletOutlinedIcon />}
            helperText={
              isCurrentMonthView
                ? 'Saldo actual menos los pagos pendientes del mes'
                : 'Saldo actual (los pendientes solo se descuentan en el mes en curso)'
            }
          />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 1', md: 'span 2', lg: 'span 1' } }}>
          <SummaryCard
            label="Proyectado"
            value={balances.projectedBalance}
            isCurrency
            tone={balances.projectedBalance >= 0 ? 'success' : 'danger'}
            icon={<TrendingUpRoundedIcon />}
            helperText={isCurrentMonthView ? 'Igual al real este mes' : 'Ingresos menos gastos del mes'}
          />
        </Box>
        <SummaryCard
          label="Total del mes"
          value={totalMonth}
          isCurrency
          icon={<ReceiptLongOutlinedIcon />}
          helperText={`${expenses.length} ${expenses.length === 1 ? 'gasto' : 'gastos'}`}
        />
        <SummaryCard
          label="Pagado"
          value={paidMonth}
          isCurrency
          tone="success"
          icon={<CheckCircleOutlineRoundedIcon />}
          helperText={`${paidPct}% del total`}
        />
        <SummaryCard
          label="Pendiente"
          value={pendingMonth}
          isCurrency
          tone="warning"
          icon={<ScheduleRoundedIcon />}
          helperText={`${pendingCount} por pagar`}
        />
      </Box>

      {/* Por cuenta + presupuestos */}
      {(showAccounts || showBudgets) && (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, md: 2.5 },
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: showAccounts && showBudgets ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' },
            alignItems: 'start',
          }}
        >
          {showAccounts && (
            <SectionCard
              title="Por cuenta"
              subtitle="Pulsa una cuenta para filtrar sus gastos"
              icon={<CreditCardOutlinedIcon />}
            >
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(150px, 1fr))' },
                }}
              >
                {accountBuckets.map((b) => {
                  const isSelected = selectedAccount === b.key;
                  const paidShare = b.total > 0 ? (b.paid / b.total) * 100 : 0;
                  return (
                    <Box
                      key={String(b.key)}
                      component="button"
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedAccount(isSelected ? null : b.key)}
                      sx={{
                        all: 'unset',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        p: 1.5,
                        borderRadius: '12px',
                        border: `1px solid ${isSelected ? t.primary : t.border}`,
                        backgroundColor: isSelected ? t.primarySoft : t.surface,
                        boxShadow: isSelected ? `0 0 0 1px ${t.primary}` : 'none',
                        transition: 'border-color .15s, background-color .15s',
                        '&:hover': { borderColor: isSelected ? t.primary : t.borderStrong },
                        '&:focus-visible': { outline: `2px solid ${t.primary}`, outlineOffset: 2 },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: b.color, flexShrink: 0 }} />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {b.name}
                        </Typography>
                      </Box>
                      <MoneyAmount value={b.total} size="md" weight={700} />
                      <LinearProgress
                        variant="determinate"
                        value={paidShare}
                        aria-label={`Pagado ${Math.round(paidShare)}%`}
                        sx={{ height: 4, '& .MuiLinearProgress-bar': { backgroundColor: t.success } }}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Typography variant="caption" sx={{ color: t.textSecondary, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <span>Pagado</span>
                          <MoneyAmount value={b.paid} size="xs" tone="success" weight={600} />
                        </Typography>
                        <Typography variant="caption" sx={{ color: t.textSecondary, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                          <span>Pendiente</span>
                          <MoneyAmount value={b.pending} size="xs" tone={b.pending > 0 ? 'warning' : 'muted'} weight={600} />
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </SectionCard>
          )}

          {showBudgets && (
            <SectionCard
              title="Presupuestos del mes"
              subtitle="Gasto por categoría frente a su límite"
              icon={<DonutLargeRoundedIcon />}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {budgetRows.map((row) => {
                  const color = row.isOver ? t.danger : getCategoryColor(row.category, muiTheme.palette.mode);
                  return (
                    <Box key={row.category}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                        <CategoryChip category={row.category} />
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <MoneyAmount value={row.spent} size="sm" tone={row.isOver ? 'danger' : 'default'} />
                          <Typography variant="caption" sx={{ color: t.textMuted, whiteSpace: 'nowrap' }}>
                            de {formatCurrency(row.limit)}
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={row.pct}
                        aria-label={`${row.category}: ${Math.round(row.pct)}% del presupuesto`}
                        sx={{ height: 6, '& .MuiLinearProgress-bar': { backgroundColor: color } }}
                      />
                      {row.isOver && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: t.danger, fontWeight: 600 }}>
                          Te has pasado {formatCurrency(row.spent - row.limit)}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </SectionCard>
          )}
        </Box>
      )}

      {/* Lista de gastos */}
      <Box
        sx={
          isMobile
            ? {}
            : {
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: '14px',
                boxShadow: t.shadowSm,
                overflow: 'hidden',
              }
        }
      >
        {/* Cabecera + filtros */}
        <Box sx={{ px: isMobile ? 0 : 2.5, pt: isMobile ? 0.5 : 2, pb: isMobile ? 1.5 : 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" component="h2" sx={{ color: t.textPrimary, lineHeight: 1.3 }}>
                Movimientos
              </Typography>
              <Typography variant="caption" sx={{ color: t.textMuted }}>
                {hasFilters
                  ? `${filteredExpenses.length} de ${expenses.length} gastos · ${formatCurrency(filteredTotal)}`
                  : `${expenses.length} ${expenses.length === 1 ? 'gasto' : 'gastos'} este mes`}
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Buscar por descripción…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              inputProps={{ 'aria-label': 'Buscar gastos por descripción' }}
              sx={{ width: { xs: '100%', md: 300 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: '1.15rem' }} />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="Borrar búsqueda"
                      onClick={() => setSearchText('')}
                      sx={{ width: 28, height: 28 }}
                    >
                      <CloseRoundedIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
          </Box>

          {/* Chips de categoría */}
          <Box
            role="group"
            aria-label="Filtrar por categoría"
            sx={{
              display: 'flex',
              gap: 0.75,
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              overflowX: isMobile ? 'auto' : 'visible',
              mx: isMobile ? -2 : 0,
              px: isMobile ? 2 : 0,
              pb: isMobile ? 0.25 : 0,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              WebkitOverflowScrolling: 'touch',
              '& > *': { flex: '0 0 auto' },
            }}
          >
            {filterChip('__all', 'Todas', selectedCategory === null, () => setSelectedCategory(null))}
            {categories.map((category) =>
              filterChip(category, category, selectedCategory === category, () =>
                setSelectedCategory(selectedCategory === category ? null : category)
              )
            )}
          </Box>

          {isMobile && (searchText || selectedAccount !== null) && (
            <Typography variant="caption" sx={{ color: t.textSecondary }}>
              Filtrado: <strong>{formatCurrency(filteredTotal)}</strong>
            </Typography>
          )}
        </Box>

        {/* Mobile cards / Desktop table */}
        {isMobile ? (
          <Box>
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rounded" height={112} sx={{ borderRadius: '14px', mb: 1.25 }} />
                ))}
              </>
            ) : filteredExpenses.length === 0 ? (
              <SectionCard>{emptyState}</SectionCard>
            ) : (
              filteredExpenses.map((expense) => {
                const isPaidInCurrentMonth = isPaidThisMonth(expense);
                const account = getAccount(expense);

                return (
                  <SwipeableCard
                    key={expense.id}
                    onDelete={() => setConfirmState({ open: true, id: expense.id! })}
                    disabled={false}
                  >
                    <Box
                      sx={{
                        backgroundColor: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: '14px',
                        boxShadow: t.shadowSm,
                        px: 1.75,
                        pt: 1.5,
                        pb: 1,
                      }}
                    >
                      {/* Header row */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <CategoryAvatar category={expense.category} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: t.textPrimary,
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {expense.description}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              columnGap: 1,
                              rowGap: 0.25,
                              mt: 0.25,
                              color: t.textMuted,
                              fontSize: '0.75rem',
                            }}
                          >
                            <span>{expense.category}</span>
                            <span aria-hidden>·</span>
                            <span style={{ whiteSpace: 'nowrap' }}>{formatDay(expense.date)}</span>
                          </Box>
                        </Box>
                        <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                          {amountButton(expense, 'md')}
                        </Box>
                      </Box>

                      {/* Meta row */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 1, pl: '52px' }}>
                        <FrequencyChip frequency={expense.frequency} />
                        {account && <AccountChip name={account.name} color={account.color} />}
                      </Box>

                      {/* Footer row */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mt: 1,
                          pt: 0.5,
                          borderTop: `1px solid ${t.border}`,
                        }}
                      >
                        {paidToggle(expense, isPaidInCurrentMonth)}
                        {rowActions(expense)}
                      </Box>
                    </Box>
                  </SwipeableCard>
                );
              })
            )}
          </Box>
        ) : (
          <TableContainer sx={{ border: 0, borderRadius: 0, borderTop: `1px solid ${t.border}` }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortConfig.key === 'description' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'description'}
                      direction={sortConfig.key === 'description' ? sortConfig.direction : 'asc'}
                      onClick={() => toggleSort('description')}
                    >
                      Descripción
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Frecuencia</TableCell>
                  <TableCell sortDirection={sortConfig.key === 'date' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'date'}
                      direction={sortConfig.key === 'date' ? sortConfig.direction : 'asc'}
                      onClick={() => toggleSort('date')}
                    >
                      Fecha
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortConfig.key === 'status' ? sortConfig.direction : false}>
                    <TableSortLabel
                      active={sortConfig.key === 'status'}
                      direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'}
                      onClick={() => toggleSort('status')}
                    >
                      Estado
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Importe</TableCell>
                  <TableCell align="right" sx={{ width: 96 }}>
                    <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                      Acciones
                    </Box>
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
                      {emptyState}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => {
                    const isPaidInCurrentMonth = isPaidThisMonth(expense);
                    const account = getAccount(expense);

                    return (
                      <TableRow key={expense.id} hover>
                        <TableCell sx={{ py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <CategoryAvatar category={expense.category} size={34} />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: t.textPrimary, minWidth: 0, overflowWrap: 'normal', wordBreak: 'normal' }}
                            >
                              {expense.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                            <CategoryChip category={expense.category} />
                            {account && <AccountChip name={account.name} color={account.color} />}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <FrequencyChip frequency={expense.frequency} />
                        </TableCell>
                        <TableCell sx={{ color: t.textSecondary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDay(expense.date)}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {paidToggle(expense, isPaidInCurrentMonth)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {amountButton(expense, 'sm')}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          {rowActions(expense)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow sx={{ backgroundColor: t.surfaceSoft }}>
                  <TableCell colSpan={5} sx={{ color: t.textSecondary, fontWeight: 600, borderBottom: 0 }}>
                    {hasFilters ? 'Total filtrado' : 'Total del mes'}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 0, whiteSpace: 'nowrap' }}>
                    <MoneyAmount value={filteredTotal} size="sm" weight={700} />
                  </TableCell>
                  <TableCell sx={{ borderBottom: 0 }} />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Diálogo de edición de importe */}
      <Dialog
        open={amountEdit.open}
        onClose={() => setAmountEdit((s) => ({ ...s, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Editar importe
          {amountEdit.expense && (
            <Typography variant="body2" component="div" sx={{ color: t.textSecondary, fontWeight: 400, mt: 0.25 }}>
              {amountEdit.expense.description}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          <TextField
            label="Importe"
            type="number"
            value={amountEdit.value}
            onChange={(e) => setAmountEdit((s) => ({ ...s, value: e.target.value }))}
            autoFocus
            fullWidth
            inputProps={{ step: '0.01', inputMode: 'decimal', style: { fontVariantNumeric: 'tabular-nums', fontWeight: 600 } }}
            InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAmountSave(amountEdit.scope);
              }
            }}
          />

          {amountEdit.expense && amountEdit.expense.frequency !== 'one-time' && (
            <Box>
              <Typography variant="overline" sx={{ display: 'block', color: t.textMuted, mb: 1 }}>
                ¿A qué meses aplicar el nuevo importe?
              </Typography>
              <RadioGroup
                value={amountEdit.scope}
                onChange={(e) =>
                  setAmountEdit((s) => ({ ...s, scope: e.target.value as 'month' | 'forward' }))
                }
                sx={{ gap: 1 }}
              >
                {(
                  [
                    { value: 'month', label: 'Solo este mes', hint: 'El resto de meses mantiene el importe actual' },
                    { value: 'forward', label: 'Este mes y los siguientes', hint: 'Cambia el importe base del gasto' },
                  ] as const
                ).map((opt) => {
                  const selected = amountEdit.scope === opt.value;
                  return (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio size="small" />}
                      label={
                        <Box sx={{ py: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                            {opt.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: t.textMuted }}>
                            {opt.hint}
                          </Typography>
                        </Box>
                      }
                      sx={{
                        m: 0,
                        pr: 1.5,
                        borderRadius: '10px',
                        border: `1px solid ${selected ? t.primary : t.border}`,
                        backgroundColor: selected ? t.primarySoft : 'transparent',
                        transition: 'border-color .15s, background-color .15s',
                      }}
                    />
                  );
                })}
              </RadioGroup>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAmountEdit((s) => ({ ...s, open: false }))}
            variant="outlined"
            color="inherit"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleAmountSave(amountEdit.scope)}
            variant="contained"
            color="primary"
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
