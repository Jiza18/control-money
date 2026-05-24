import { useState, useEffect, useRef } from 'react';
import { Expense } from '../db/config';
import {
  Box,
  Fab,
  Tooltip,
  Chip,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import AnnualOverview from './AnnualOverview';
import { BottomSheet } from './ui';
import { getAIConfig } from '../db/aiConfigService';
import { resizeImage, parseReceiptWithAI, type ParsedReceipt } from '../services/aiReceiptParser';
import { useToast } from '../contexts/ToastContext';

export default function Expenses() {
  const toast = useToast();
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

  const openCamera = async () => {
    setChoiceOpen(false);
    const config = await getAIConfig();
    if (!config?.apiKey) {
      toast.error('Configura tu API key de Anthropic en Configuración → Inteligencia Artificial');
      return;
    }
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
      if (!config?.apiKey) throw new Error('API key no configurada');

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

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Gastos
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="Vista Mensual"
            onClick={() => setViewMode('monthly')}
            variant={viewMode === 'monthly' ? 'filled' : 'outlined'}
            color={viewMode === 'monthly' ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
          <Chip
            label="Vista Anual"
            onClick={() => setViewMode('annual')}
            variant={viewMode === 'annual' ? 'filled' : 'outlined'}
            color={viewMode === 'annual' ? 'primary' : 'default'}
            size="small"
            sx={{ fontWeight: 600, cursor: 'pointer' }}
          />
        </Box>
      </Box>

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
          <Backdrop open={isProcessing} sx={{ zIndex: 1400, flexDirection: 'column', gap: 2 }}>
            <CircularProgress color="inherit" />
            <Typography variant="body2" sx={{ color: '#fff' }}>
              Analizando ticket…
            </Typography>
          </Backdrop>

          {/* FAB */}
          <Tooltip title="Añadir gasto" placement="left">
            <Fab
              aria-label="Añadir gasto"
              size="small"
              onClick={() => setChoiceOpen(true)}
              sx={{
                position: 'fixed',
                right: 'calc(env(safe-area-inset-right) + 16px)',
                bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) - 16px)',
                zIndex: 1000,
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                background: 'linear-gradient(90deg, #10B981, #059669)',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
                border: '1px solid rgba(255,255,255,0.25)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #059669, #047857)',
                  boxShadow: '0 10px 24px rgba(5, 150, 105, 0.45)',
                },
              }}
            >
              <AddIcon fontSize="small" />
            </Fab>
          </Tooltip>

          {/* Choice bottom sheet */}
          <BottomSheet
            open={choiceOpen}
            onClose={() => setChoiceOpen(false)}
            title="Añadir gasto"
          >
            <List disablePadding>
              <ListItemButton onClick={openManual} sx={{ borderRadius: 2, mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <EditNoteIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Añadir manualmente"
                  secondary="Rellena el formulario tú mismo"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItemButton>

              <ListItemButton onClick={openCamera} sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <CameraAltIcon sx={{ color: '#F59E0B' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Escanear ticket"
                  secondary="Toma una foto y la IA rellena el gasto"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItemButton>
            </List>
          </BottomSheet>

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
