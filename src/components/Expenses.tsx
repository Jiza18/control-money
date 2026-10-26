import { useState, useEffect, useRef } from 'react';
import { Expense } from '../db/config';
import {
  Box,
  Button,
  Fab,
  Tooltip,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import AnnualOverview from './AnnualOverview';
import { isFutureMonth } from '../db/monthProjection';
import { BottomSheet, PageHeader } from './ui';
import { tokens } from '../theme';
import { getAIConfig } from '../db/aiConfigService';
import { resizeImage, parseReceiptWithAI, type ParsedReceipt } from '../services/aiReceiptParser';
import { useToast } from '../contexts/ToastContext';

export default function Expenses() {
  const toast = useToast();
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Omit<Expense, 'id'>> | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsExpenseFormOpen(true);
  };

  const handleExpenseDeleted = () => {
    const event = new Event('expenseAdded');
    document.dispatchEvent(event);
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  useEffect(() => {
    const handleBalanceUpdate = () => handleExpenseDeleted();
    document.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => document.removeEventListener('balanceUpdated', handleBalanceUpdate);
  }, []);

  const openManual = () => {
    setChoiceOpen(false);
    setPrefill(undefined);
    setSelectedExpense(null);
    setIsExpenseFormOpen(true);
  };

  // Must be synchronous — iOS Safari blocks programmatic input.click()
  // if there's any await before it (loses the user gesture context)
  const openCamera = () => {
    setChoiceOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected if needed
    e.target.value = '';

    setIsProcessing(true);
    try {
      const config = await getAIConfig();
      if (!config?.apiKey) {
        throw new Error('Configura tu API key de Anthropic en Configuración → Inteligencia Artificial');
      }

      const { base64, mimeType } = await resizeImage(file);
      const parsed: ParsedReceipt = await parseReceiptWithAI(base64, mimeType, config.apiKey);

      const newPrefill: Partial<Omit<Expense, 'id'>> = {
        description: parsed.description,
        category: parsed.category,
        amount: parsed.amount ?? 0,
        date: parsed.date ? new Date(parsed.date) : currentMonth,
        frequency: 'one-time',
        isPaid: false,
      };

      setPrefill(newPrefill);
      setSelectedExpense(null);
      setIsExpenseFormOpen(true);
      toast.success('Ticket analizado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al analizar el ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const isCurrentMonthView =
    currentMonth.getFullYear() === new Date().getFullYear() &&
    currentMonth.getMonth() === new Date().getMonth();

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) =>
    c.toUpperCase()
  );

  const choiceList = (
    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[
        {
          key: 'manual',
          onClick: openManual,
          icon: <EditNoteRoundedIcon />,
          fg: t.primary,
          bg: t.primarySoft,
          primary: 'Añadir manualmente',
          secondary: 'Rellena el formulario tú mismo',
        },
        {
          key: 'camera',
          onClick: openCamera,
          icon: <PhotoCameraOutlinedIcon />,
          fg: t.warning,
          bg: t.warningSoft,
          primary: 'Escanear ticket',
          secondary: 'Toma una foto y la IA rellena el gasto',
        },
      ].map((item) => (
        <ListItemButton
          key={item.key}
          onClick={item.onClick}
          sx={{
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
            px: 1.5,
            py: 1.25,
            gap: 1.5,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: item.fg,
              backgroundColor: item.bg,
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.primary}
            secondary={item.secondary}
            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9375rem' }}
            secondaryTypographyProps={{ fontSize: '0.8125rem' }}
          />
          <ChevronRightRoundedIcon sx={{ color: t.textMuted }} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box>
      <PageHeader
        title="Gastos"
        subtitle={
          viewMode === 'monthly'
            ? isCurrentMonthView
              ? 'Tus pagos de este mes, de un vistazo'
              : isFutureMonth(currentMonth)
                ? `Planifica ${monthLabel.toLowerCase()}: nómina, reparto y lo que te quedará`
                : `Lo que pagaste en ${monthLabel.toLowerCase()}`
            : 'Evolución de tus gastos a lo largo del año'
        }
        actions={
          <>
            {viewMode === 'monthly' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 40,
                  borderRadius: '10px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: t.surface,
                  boxShadow: t.shadowSm,
                  px: 0.25,
                }}
              >
                <Tooltip title="Mes anterior">
                  <IconButton
                    size="small"
                    aria-label="Mes anterior"
                    onClick={() => handleMonthChange(subMonths(currentMonth, 1))}
                    sx={{ width: 34, height: 34 }}
                  >
                    <ChevronLeftRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: { xs: 0.5, sm: 1 }, minWidth: { xs: 112, sm: 136 }, justifyContent: 'center' }}
                  aria-live="polite"
                >
                  <CalendarMonthOutlinedIcon sx={{ fontSize: '1rem', color: t.textMuted, display: { xs: 'none', sm: 'block' } }} />
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: t.textPrimary, whiteSpace: 'nowrap' }}>
                    {monthLabel}
                  </Typography>
                </Box>
                <Tooltip title="Mes siguiente">
                  <IconButton
                    size="small"
                    aria-label="Mes siguiente"
                    onClick={() => handleMonthChange(addMonths(currentMonth, 1))}
                    sx={{ width: 34, height: 34 }}
                  >
                    <ChevronRightRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_, value: 'monthly' | 'annual' | null) => value && setViewMode(value)}
              aria-label="Tipo de vista"
            >
              <ToggleButton value="monthly" aria-label="Vista mensual">Mensual</ToggleButton>
              <ToggleButton value="annual" aria-label="Vista anual">Anual</ToggleButton>
            </ToggleButtonGroup>
            {/* En escritorio la acción principal va en la cabecera; en móvil, en el FAB */}
            {!isMobile && viewMode === 'monthly' && (
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => setChoiceOpen(true)}
                aria-label="Añadir gasto"
              >
                Añadir gasto
              </Button>
            )}
          </>
        }
      />

      {viewMode === 'monthly' ? (
        <>
          <ExpenseList
            currentMonth={currentMonth}
            onEditExpense={handleEditExpense}
            onExpenseDeleted={handleExpenseDeleted}
            onMonthChange={handleMonthChange}
          />

          {/* Hidden camera input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Processing overlay */}
          <Backdrop open={isProcessing} sx={{ zIndex: 1400, flexDirection: 'column', gap: 2, color: 'common.white' }}>
            <CircularProgress color="inherit" />
            <Typography variant="body2" sx={{ color: 'common.white', fontWeight: 500 }}>
              Analizando ticket…
            </Typography>
          </Backdrop>

          {/* FAB (móvil y tablet) */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="Añadir gasto"
              onClick={() => setChoiceOpen(true)}
              sx={{
                position: 'fixed',
                right: 'calc(env(safe-area-inset-right) + 20px)',
                bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
                zIndex: 1000,
                width: 56,
                height: 56,
              }}
            >
              <AddRoundedIcon />
            </Fab>
          )}

          {/* Choice: bottom sheet en móvil, diálogo en escritorio */}
          {isMobile ? (
            <BottomSheet
              open={choiceOpen}
              onClose={() => setChoiceOpen(false)}
              title="Añadir gasto"
            >
              {choiceList}
            </BottomSheet>
          ) : (
            <Dialog open={choiceOpen} onClose={() => setChoiceOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle>Añadir gasto</DialogTitle>
              <DialogContent sx={{ pb: 3 }}>{choiceList}</DialogContent>
            </Dialog>
          )}

          <ExpenseForm
            open={isExpenseFormOpen}
            onClose={() => {
              setIsExpenseFormOpen(false);
              setSelectedExpense(null);
              setPrefill(undefined);
            }}
            onExpenseAdded={handleExpenseDeleted}
            expense={selectedExpense}
            selectedMonth={currentMonth}
            prefill={prefill}
          />
        </>
      ) : (
        <AnnualOverview />
      )}
    </Box>
  );
}
