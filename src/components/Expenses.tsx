import { useState, useEffect } from 'react';
import { Expense } from '../db/config';
import { Box, Fab, Tooltip, Chip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import AnnualOverview from './AnnualOverview';

export default function Expenses() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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
    const handleBalanceUpdate = () => {
      handleExpenseDeleted();
    };
    document.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => {
      document.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

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

          {/* FAB verde para añadir gasto */}
          <Tooltip title="Añadir gasto" placement="left">
            <Fab
              aria-label="Añadir gasto"
              size="small"
              onClick={() => {
                setSelectedExpense(null);
                setIsExpenseFormOpen(true);
              }}
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

          <ExpenseForm
            open={isExpenseFormOpen}
            onClose={() => {
              setIsExpenseFormOpen(false);
              setSelectedExpense(null);
            }}
            onExpenseAdded={handleExpenseDeleted}
            expense={selectedExpense}
            selectedMonth={currentMonth}
          />
        </>
      ) : (
        <AnnualOverview />
      )}
    </Box>
  );
}
