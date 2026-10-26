import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { es } from 'date-fns/locale';
import { Expense, Account } from '../db/config';
import { addExpense, updateExpense } from '../db';
import { getAllAccounts } from '../db/accountsService';
import { FormSection, AccountChip, DecimalField } from './ui';
import { tokens, getCategoryColor } from '../theme';

const categories = [
  'Préstamos',
  'Gastos Fijos',
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Ahorro',
  'Otros',
];

const frequencies = [
  { value: 'one-time', label: 'Una vez' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'bi-monthly', label: 'Cada 2 meses' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual', label: 'Anual' },
];

interface ExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  expense?: Expense | null;
  selectedMonth: Date;
  prefill?: Partial<Omit<Expense, 'id'>>;
}

export default function ExpenseForm({
  open,
  onClose,
  onExpenseAdded,
  expense: expenseProp,
  selectedMonth,
  prefill,
}: ExpenseFormProps) {
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [expense, setExpense] = useState<Omit<Expense, 'id'>>(() => ({
    amount: 0,
    category: '',
    description: '',
    date: selectedMonth,
    frequency: 'one-time',
    isPaid: false,
    paymentHistory: [],
  }));

  useEffect(() => {
    if (!open) return;
    getAllAccounts()
      .then(setAccounts)
      .catch((error) => console.error('Error loading accounts:', error));
  }, [open]);

  useEffect(() => {
    if (expenseProp) {
      const { id, ...expenseData } = expenseProp;
      void id;
      setExpense({
        ...expenseData,
        date: new Date(expenseData.date),
        nextPaymentDate: expenseData.nextPaymentDate
          ? new Date(expenseData.nextPaymentDate)
          : undefined,
        paymentHistory: expenseData.paymentHistory || [],
      });
    } else {
      setExpense({
        amount: prefill?.amount ?? 0,
        category: prefill?.category ?? '',
        description: prefill?.description ?? '',
        date: prefill?.date ? new Date(prefill.date as unknown as string) : selectedMonth,
        frequency: prefill?.frequency ?? 'one-time',
        isPaid: prefill?.isPaid ?? false,
        paymentHistory: [],
      });
    }
  }, [expenseProp, selectedMonth, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentDate = selectedMonth;
      if (expenseProp?.id) {
        if (expense.frequency !== 'one-time') {
          const paymentRecord = expense.paymentHistory?.find((record) => {
            const recordDate = new Date(record.date);
            return (
              recordDate.getMonth() === currentDate.getMonth() &&
              recordDate.getFullYear() === currentDate.getFullYear()
            );
          });

          if (paymentRecord) {
            const updatedPaymentHistory = expense.paymentHistory?.map((record) => {
              if (record === paymentRecord) {
                return { ...record, amount: expense.amount };
              }
              return record;
            });
            expense.paymentHistory = updatedPaymentHistory;
          } else {
            expense.paymentHistory = [
              ...(expense.paymentHistory || []),
              {
                date: currentDate,
                isPaid: false,
                amount: expense.amount,
              },
            ];
          }
        }
        await updateExpense({ ...expense, id: expenseProp.id });
      } else {
        if (expense.frequency !== 'one-time') {
          const nextTwelveMonths = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(currentDate);
            date.setMonth(currentDate.getMonth() + i);
            return {
              date,
              isPaid: false,
              amount: expense.amount,
            };
          });
          expense.paymentHistory = nextTwelveMonths;
        }
        await addExpense(expense);
      }

      setExpense({
        amount: 0,
        category: '',
        description: '',
        date: selectedMonth,
        frequency: 'one-time',
        isPaid: false,
        paymentHistory: [],
      });
      onExpenseAdded();
      onClose();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const isEditing = !!expenseProp;
  const mode = muiTheme.palette.mode;

  const categoryOption = (category: string) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="span"
        sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: getCategoryColor(category, mode), flexShrink: 0 }}
      />
      {category}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile
          ? { borderRadius: 0, margin: 0, maxHeight: '100%', border: 0 }
          : undefined,
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, sm: 3 },
          pt: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : 2.5,
          pb: 2,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {isEditing ? 'Editar gasto' : 'Nuevo gasto'}
          </Typography>
          <Typography variant="caption" sx={{ color: t.textMuted, display: 'block' }}>
            {isEditing
              ? 'Modifica los datos y guarda los cambios'
              : 'Registra un gasto puntual o recurrente'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar" edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            px: { xs: 2, sm: 3 },
            pt: '20px !important',
            pb: 3,
          }}
        >
          {/* Sección: Importe y fecha */}
          <FormSection title="Importe y fecha">
            <DecimalField
              label="Importe"
              value={expense.amount}
              onValueChange={(value) => setExpense((prev) => ({ ...prev, amount: value ?? 0 }))}
              required
              fullWidth
              placeholder="0,00"
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
              inputProps={{
                style: { fontSize: '1.25rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
              }}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel id="frequency-label">Frecuencia</InputLabel>
                <Select
                  labelId="frequency-label"
                  value={expense.frequency}
                  label="Frecuencia"
                  onChange={(e) =>
                    setExpense({
                      ...expense,
                      frequency: e.target.value as Expense['frequency'],
                    })
                  }
                >
                  {frequencies.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label={
                    expense.frequency === 'one-time' ? 'Fecha del gasto' : 'Fecha de inicio'
                  }
                  value={expense.date}
                  onChange={(newDate) => newDate && setExpense({ ...expense, date: newDate })}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
            <Typography variant="caption" sx={{ color: t.textMuted, mt: -1 }}>
              {expense.frequency === 'one-time'
                ? 'Fecha en que se realizó el gasto.'
                : 'Fecha del primer pago; se repetirá con la frecuencia elegida.'}
            </Typography>
          </FormSection>

          {/* Sección: Detalles */}
          <FormSection title="Detalles">
            <TextField
              label="Descripción"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
              required
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder="Ej.: Alquiler, supermercado, gasolina…"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel id="category-label">Categoría</InputLabel>
                <Select
                  labelId="category-label"
                  value={expense.category}
                  label="Categoría"
                  onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                  renderValue={(value) => (value ? categoryOption(value) : '')}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {categoryOption(category)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="account-label" shrink>Cuenta</InputLabel>
                <Select
                  labelId="account-label"
                  value={expense.accountId != null ? String(expense.accountId) : ''}
                  input={<OutlinedInput notched label="Cuenta" />}
                  onChange={(e) =>
                    setExpense({
                      ...expense,
                      accountId:
                        e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  renderValue={(value) => {
                    if (!value) return <Box component="span" sx={{ color: t.textMuted }}>Sin cuenta</Box>;
                    const acc = accounts.find((a) => String(a.id) === value);
                    return acc ? (
                      <AccountChip name={acc.name} color={acc.color} />
                    ) : (
                      <Box component="span" sx={{ color: t.textMuted }}>Sin cuenta</Box>
                    );
                  }}
                  displayEmpty
                  sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
                >
                  <MenuItem value="">
                    <Box component="span" sx={{ color: t.textMuted }}>Sin cuenta</Box>
                  </MenuItem>
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      <AccountChip name={account.name} color={account.color} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </FormSection>

          {/* Sección: Opciones (sólo si aplica) */}
          {expense.category === 'Préstamos' && expense.frequency !== 'one-time' && (
            <FormSection title="Préstamo">
              <DecimalField
                label="Duración (meses)"
                integer
                value={expense.duration}
                onValueChange={(value) => setExpense((prev) => ({ ...prev, duration: value }))}
                fullWidth
                required
                helperText="Número de meses durante los que se realizará el pago"
              />
            </FormSection>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 1,
            borderTop: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            ...(isMobile && {
              position: 'sticky',
              bottom: 0,
              mt: 'auto',
              pb: 'calc(env(safe-area-inset-bottom) + 16px)',
            }),
          }}
        >
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ flex: isMobile ? 1 : undefined }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ flex: isMobile ? 2 : undefined, minWidth: 120 }}
          >
            {isEditing ? 'Guardar cambios' : 'Guardar gasto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
