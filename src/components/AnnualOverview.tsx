import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonBase,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfYear, eachMonthOfInterval, endOfYear, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Expense } from '../db/config';
// Usar adaptador de repositorio para respetar la BD activa
import { getExpensesByMonth, getCurrentBalance } from '../db';
import { tokens, getCategoryColor } from '../theme';
import { formatCurrency, formatCurrencyCompact } from '../utils/formatters';
import { SectionCard, SummaryCard } from './ui';
import { usePrivacy } from '../contexts/PrivacyContext';

interface MonthlyExpenses {
  [key: string]: {
    total: number;
    totalPaid: number;
    byCategory: { [category: string]: number };
    byCategoryPaid: { [category: string]: number };
  };
}

export default function AnnualOverview() {
  const [currentYear] = useState(new Date());
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenses>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [balance, setBalance] = useState<{ amount: number; monthlyIncome: number } | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const months = eachMonthOfInterval({
    start: startOfYear(currentYear),
    end: endOfYear(currentYear)
  });

  const muiTheme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)');

  // Definir loadExpenses antes de los useEffect para evitar ReferenceError en arrays de dependencias
  const loadExpenses = useCallback(async () => {
    try {
      const monthlyData: MonthlyExpenses = {};
      const allCategories = new Set<string>();
      let allExpenses: Expense[] = [];

      // Obtener gastos para cada mes y calcular totales
      for (const month of months) {
        const monthKey = format(month, 'yyyy-MM');
        const monthExpenses = await getExpensesByMonth(month);
        allExpenses = [...allExpenses, ...monthExpenses];

        // Extraer categorías y calcular totales
        monthlyData[monthKey] = {
          total: 0,
          totalPaid: 0,
          byCategory: {},
          byCategoryPaid: {}
        };

        monthExpenses.forEach(expense => {
          const { category, amount } = expense;
          allCategories.add(category);

          // Verificar si el gasto está pagado en este mes
          const paymentRecord = expense.paymentHistory?.find((record: any) => 
            format(new Date(record.date), 'yyyy-MM') === monthKey
          );
          const isPaid = paymentRecord?.isPaid || false;

          // Actualizar totales generales
          monthlyData[monthKey].total += amount;
          if (isPaid) monthlyData[monthKey].totalPaid += amount;

          // Actualizar totales por categoría
          monthlyData[monthKey].byCategory[category] = 
            (monthlyData[monthKey].byCategory[category] || 0) + amount;
          
          if (isPaid) {
            monthlyData[monthKey].byCategoryPaid[category] = 
              (monthlyData[monthKey].byCategoryPaid[category] || 0) + amount;
          }
        });
      }

      setCategories(Array.from(allCategories));
      setMonthlyExpenses(monthlyData);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }, [months]);

  useEffect(() => {
    // Inicializar todos los meses como seleccionados
    setSelectedMonths(months.map(month => format(month, 'yyyy-MM')));
  }, [currentYear]);

  useEffect(() => {
    const loadData = async () => {
      await loadExpenses();
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    };
    loadData();
  }, [currentYear]);

  // Escuchar cambios de BD para recargar datos
  useEffect(() => {
    const handler = async () => {
      await loadExpenses();
      const currentBalance = await getCurrentBalance();
      setBalance(currentBalance);
    };
    window.addEventListener('dbTypeChanged', handler as any);
    return () => window.removeEventListener('dbTypeChanged', handler as any);
  }, [loadExpenses]);

  

  const handleMonthToggle = (monthKey: string) => {
    setSelectedMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  const calculateFilteredTotal = (category?: string) => {
    return selectedMonths.reduce((acc, monthKey) => {
      if (category) {
        // Asegurar acceso seguro cuando monthlyExpenses aún no está cargado
        return acc + (monthlyExpenses[monthKey]?.byCategory?.[category] || 0);
      } else {
        return acc + Object.values(monthlyExpenses[monthKey]?.byCategory || {}).reduce((sum, amount) => sum + amount, 0);
      }
    }, 0);
  };

  const chartData = months.map((month) => {
    const key = format(month, 'yyyy-MM');
    const data = monthlyExpenses[key];
    return {
      name: format(month, 'MMM', { locale: es }),
      total: selectedMonths.includes(key) ? (data?.total || 0) : 0,
      pagado: selectedMonths.includes(key) ? (data?.totalPaid || 0) : 0,
    };
  });

  const hasChartData = chartData.some((d) => d.total > 0);
  const mode = muiTheme.palette.mode;
  const t = tokens[mode];
  const { privacyMode } = usePrivacy();
  const money = (amount: number) => (privacyMode ? '•••••' : formatCurrency(amount));

  // Balance real del mes (misma regla que antes: 0 si todo está pagado)
  const getRealBalance = (month: Date) => {
    const monthKey = format(month, 'yyyy-MM');
    const monthExpenses = monthlyExpenses[monthKey] || { total: 0, totalPaid: 0 };
    if (monthExpenses.total === monthExpenses.totalPaid) return 0;
    const pendingExpenses = monthExpenses.total - monthExpenses.totalPaid;
    return balance?.amount
      ? (isSameMonth(month, new Date()) ? balance.amount - pendingExpenses : balance.monthlyIncome - pendingExpenses)
      : 0;
  };

  const getProjectedBalance = (monthKey: string) => {
    const monthExpenses = monthlyExpenses[monthKey] || { total: 0 };
    return balance?.monthlyIncome ? balance.monthlyIncome - monthExpenses.total : 0;
  };

  const selectedTotalPaid = selectedMonths.reduce(
    (acc, monthKey) => acc + (monthlyExpenses[monthKey]?.totalPaid || 0),
    0
  );
  const selectedProjected = selectedMonths.reduce((acc, monthKey) => acc + getProjectedBalance(monthKey), 0);
  const selectedRealBalance = selectedMonths.reduce((acc, monthKey) => {
    const month = months.find((m) => format(m, 'yyyy-MM') === monthKey);
    return month ? acc + getRealBalance(month) : acc;
  }, 0);

  const seriesColors = { total: t.primary, pagado: t.success };
  const monthLabel = (month: Date) => format(month, 'MMM', { locale: es }).replace('.', '');

  // Celda de importe: tabular, a la derecha, ceros atenuados
  const amountCellSx = (amount: number, selected: boolean, tone?: 'balance') => ({
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
    fontVariantNumeric: 'tabular-nums',
    opacity: selected ? 1 : 0.35,
    transition: 'opacity 0.2s ease',
    color:
      tone === 'balance'
        ? amount === 0
          ? t.textMuted
          : amount > 0
            ? t.success
            : t.danger
        : amount === 0
          ? t.textMuted
          : 'inherit',
  });

  const stickyFirstCell = (bg: string) => ({
    position: 'sticky' as const,
    left: 0,
    zIndex: 2,
    backgroundColor: bg,
    whiteSpace: 'nowrap' as const,
    borderRight: `1px solid ${t.border}`,
    minWidth: 180,
  });

  const totalsRowSx = {
    '& > td, & > th': { backgroundColor: t.surfaceSoft },
  };

  const CategoryLabel = ({ category }: { category: string }) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Box
        component="span"
        sx={{ width: 8, height: 8, borderRadius: '3px', backgroundColor: getCategoryColor(category, mode), flexShrink: 0 }}
      />
      {category}
    </Box>
  );

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box
        sx={{
          backgroundColor: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: '10px',
          boxShadow: t.shadowLg,
          px: 1.5,
          py: 1.25,
          minWidth: 160,
        }}
      >
        <Typography variant="caption" sx={{ color: t.textMuted, fontWeight: 600, textTransform: 'capitalize' }}>
          {label} {format(currentYear, 'yyyy')}
        </Typography>
        {payload.map((p: any) => (
          <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: p.color }} />
            <Typography variant="body2" sx={{ color: t.textSecondary, flex: 1 }}>
              {p.dataKey === 'total' ? 'Total' : 'Pagado'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {money(Number(p.value))}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  const legend = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {(['total', 'pagado'] as const).map((key) => (
        <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: seriesColors[key] }} />
          <Typography variant="caption" sx={{ color: t.textSecondary, fontWeight: 500 }}>
            {key === 'total' ? 'Total' : 'Pagado'}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 2.5 }, minWidth: 0 }}>
      {/* Selector de meses */}
      <SectionCard
        title={`Resumen anual ${format(currentYear, 'yyyy')}`}
        subtitle={`${selectedMonths.length} de ${months.length} meses incluidos · toca un mes para excluirlo`}
      >
        <Box
          role="group"
          aria-label="Meses incluidos"
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            mx: { xs: -2, sm: 0 },
            px: { xs: 2, sm: 0 },
            pb: 0.25,
            flexWrap: { xs: 'nowrap', md: 'wrap' },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {months.map((month) => {
            const monthKey = format(month, 'yyyy-MM');
            const selected = selectedMonths.includes(monthKey);
            return (
              <ButtonBase
                key={month.toString()}
                onClick={() => handleMonthToggle(monthKey)}
                aria-pressed={selected}
                sx={{
                  flexShrink: 0,
                  minWidth: 52,
                  height: 34,
                  px: 1.5,
                  borderRadius: '9px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: `1px solid ${selected ? t.primary : t.border}`,
                  backgroundColor: selected ? t.primarySoft : t.surface,
                  color: selected ? t.primary : t.textMuted,
                  transition: 'background-color .15s, color .15s, border-color .15s',
                  '&:hover': { borderColor: selected ? t.primary : t.borderStrong, color: selected ? t.primary : t.textPrimary },
                  '&.Mui-focusVisible': { outline: `2px solid ${t.primary}`, outlineOffset: 2 },
                }}
              >
                {monthLabel(month)}
              </ButtonBase>
            );
          })}
        </Box>
      </SectionCard>

      {/* Totales de los meses seleccionados */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <SummaryCard label="Total gastos" value={calculateFilteredTotal()} isCurrency icon={<ReceiptLongOutlinedIcon />} tone="primary" />
        <SummaryCard label="Total pagado" value={selectedTotalPaid} isCurrency icon={<TaskAltRoundedIcon />} tone="default" />
        <SummaryCard
          label="Balance real"
          value={selectedRealBalance}
          isCurrency
          icon={<AccountBalanceOutlinedIcon />}
          tone={selectedRealBalance >= 0 ? 'success' : 'danger'}
        />
        <SummaryCard
          label="Proyectado"
          value={selectedProjected}
          isCurrency
          icon={<AccountBalanceWalletOutlinedIcon />}
          tone={selectedProjected >= 0 ? 'success' : 'danger'}
        />
      </Box>

      {/* Gráfica de barras */}
      {hasChartData && (
        <SectionCard title="Gastos por mes" subtitle="Total frente a pagado" actions={isMobile ? undefined : legend}>
          {isMobile && <Box sx={{ mb: 1.5 }}>{legend}</Box>}
          <Box sx={{ height: { xs: 220, md: 280 }, mx: -1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={t.border} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: t.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.replace('.', '')}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: t.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 52 : 64}
                  tickFormatter={(v: number) => (privacyMode ? '' : formatCurrencyCompact(v))}
                />
                <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: t.surfaceSoft }} />
                <Bar dataKey="total" fill={seriesColors.total} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="pagado" fill={seriesColors.pagado} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </SectionCard>
      )}

      {isMobile ? (
        <SectionCard title="Por categoría" subtitle="Total de los meses incluidos" noPadding>
          {categories.map((category) => {
            const totalCategory = calculateFilteredTotal(category);
            return (
              <Accordion
                key={category}
                sx={{
                  border: 0,
                  borderRadius: '0 !important',
                  boxShadow: 'none',
                  borderBottom: `1px solid ${t.border}`,
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', gap: 1, pr: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                      <CategoryLabel category={category} />
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {money(totalCategory)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pt: 1.5, pb: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                    {months.map((month) => {
                      const monthKey = format(month, 'yyyy-MM');
                      if (!selectedMonths.includes(monthKey)) return null;
                      const amount = monthlyExpenses[monthKey]?.byCategory?.[category] || 0;
                      return (
                        <Box
                          key={month.toString()}
                          sx={{ borderRadius: '8px', backgroundColor: t.surfaceSoft, px: 1, py: 0.75, minWidth: 0 }}
                        >
                          <Typography variant="caption" sx={{ display: 'block', color: t.textMuted, textTransform: 'capitalize', lineHeight: 1.3 }}>
                            {monthLabel(month)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontWeight: 600,
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: amount === 0 ? t.textMuted : t.textPrimary,
                            }}
                          >
                            {money(amount)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {categories.length === 0 && (
            <Typography variant="body2" sx={{ color: t.textMuted, p: 2.5, textAlign: 'center' }}>
              No hay gastos este año
            </Typography>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Detalle por categoría" subtitle="Importes por mes; los meses excluidos aparecen atenuados" noPadding>
          <TableContainer sx={{ border: 0, borderRadius: 0, maxWidth: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ '& td, & th': { py: 1.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...stickyFirstCell(t.surfaceSoft), zIndex: 3 }}>Categoría</TableCell>
                  {months.map((month) => (
                    <TableCell
                      key={month.toString()}
                      align="right"
                      sx={{ opacity: selectedMonths.includes(format(month, 'yyyy-MM')) ? 1 : 0.45 }}
                    >
                      {monthLabel(month)}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ borderLeft: `1px solid ${t.border}`, color: `${t.textSecondary} !important` }}>
                    Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category} hover>
                    <TableCell component="th" scope="row" sx={{ ...stickyFirstCell(t.surface), fontWeight: 500 }}>
                      <CategoryLabel category={category} />
                    </TableCell>
                    {months.map((month) => {
                      const monthKey = format(month, 'yyyy-MM');
                      const selected = selectedMonths.includes(monthKey);
                      const amount = selected ? (monthlyExpenses[monthKey]?.byCategory?.[category] || 0) : 0;
                      return (
                        <TableCell key={month.toString()} sx={amountCellSx(amount, selected)}>
                          {money(amount)}
                        </TableCell>
                      );
                    })}
                    <TableCell sx={{ ...amountCellSx(calculateFilteredTotal(category), true), fontWeight: 600, borderLeft: `1px solid ${t.border}` }}>
                      {money(calculateFilteredTotal(category))}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totales */}
                <TableRow sx={{ ...totalsRowSx, '& > td, & > th': { ...totalsRowSx['& > td, & > th'], borderTop: `1px solid ${t.borderStrong}`, fontWeight: 600 } }}>
                  <TableCell component="th" scope="row" sx={stickyFirstCell(t.surfaceSoft)}>Total mensual</TableCell>
                  {months.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const selected = selectedMonths.includes(monthKey);
                    const total = selected
                      ? Object.values(monthlyExpenses[monthKey]?.byCategory || {}).reduce((sum, amount) => sum + amount, 0)
                      : 0;
                    return (
                      <TableCell key={month.toString()} sx={{ ...amountCellSx(total, selected), fontWeight: 600 }}>
                        {money(total)}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ ...amountCellSx(calculateFilteredTotal(), true), fontWeight: 700, borderLeft: `1px solid ${t.border}` }}>
                    {money(calculateFilteredTotal())}
                  </TableCell>
                </TableRow>

                <TableRow sx={totalsRowSx}>
                  <TableCell component="th" scope="row" sx={{ ...stickyFirstCell(t.surfaceSoft), color: t.textSecondary }}>Total pagado</TableCell>
                  {months.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const selected = selectedMonths.includes(monthKey);
                    const totalPaid = selected ? monthlyExpenses[monthKey]?.totalPaid || 0 : 0;
                    return (
                      <TableCell key={month.toString()} sx={{ ...amountCellSx(totalPaid, selected), color: totalPaid === 0 ? t.textMuted : t.textSecondary }}>
                        {money(totalPaid)}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ ...amountCellSx(selectedTotalPaid, true), fontWeight: 600, color: t.textSecondary, borderLeft: `1px solid ${t.border}` }}>
                    {money(selectedTotalPaid)}
                  </TableCell>
                </TableRow>

                <TableRow sx={totalsRowSx}>
                  <TableCell component="th" scope="row" sx={{ ...stickyFirstCell(t.surfaceSoft), fontWeight: 600 }}>Balance real</TableCell>
                  {months.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const selected = selectedMonths.includes(monthKey);
                    const realBalance = selected ? getRealBalance(month) : 0;
                    return (
                      <TableCell key={month.toString()} sx={{ ...amountCellSx(realBalance, selected, 'balance'), fontWeight: 600 }}>
                        {money(realBalance)}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ ...amountCellSx(selectedRealBalance, true, 'balance'), fontWeight: 700, borderLeft: `1px solid ${t.border}` }}>
                    {money(selectedRealBalance)}
                  </TableCell>
                </TableRow>

                <TableRow sx={totalsRowSx}>
                  <TableCell component="th" scope="row" sx={{ ...stickyFirstCell(t.surfaceSoft), fontWeight: 600 }}>Balance proyectado</TableCell>
                  {months.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const selected = selectedMonths.includes(monthKey);
                    const projectedBalance = selected ? getProjectedBalance(monthKey) : 0;
                    return (
                      <TableCell key={month.toString()} sx={{ ...amountCellSx(projectedBalance, selected, 'balance'), fontWeight: 600 }}>
                        {money(projectedBalance)}
                      </TableCell>
                    );
                  })}
                  <TableCell sx={{ ...amountCellSx(selectedProjected, true, 'balance'), fontWeight: 700, borderLeft: `1px solid ${t.border}` }}>
                    {money(selectedProjected)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}
    </Box>
  );
}
