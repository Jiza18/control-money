import { useState, useEffect } from 'react';
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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Fab,
  Grid,
  Skeleton,
  InputBase,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SavingsIcon from '@mui/icons-material/Savings';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { es } from 'date-fns/locale';
import { SavingsGoal } from '../db/config';
import {
  calculateEstimatedCompletion,
  calculateMonthlyContribution,
  calculateTimeRemaining,
} from '../db/savingsServices';
import {
  getSavingsGoals as getAllSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from '../db';
import { formatCurrency } from '../utils/formatters';
import { SAVINGS_CONSTANTS } from '../constants/savings';
import ProgressBar from './ProgressBar';
import DateDisplay from './DateDisplay';
import SavingsSummaryRow from './SavingsSummaryRow';
import { SummaryCard, StatusChip, EmptyState, ConfirmDialog, FormSection, SwipeableCard } from './ui';
import { tokens } from '../theme';
import { useToast } from '../contexts/ToastContext';

export default function SavingsList() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState<
    Omit<SavingsGoal, 'id'> & { calculateByDate?: boolean }
  >(() => ({
    name: SAVINGS_CONSTANTS.FORM_DEFAULTS.NAME,
    description: SAVINGS_CONSTANTS.FORM_DEFAULTS.DESCRIPTION,
    targetAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.TARGET_AMOUNT,
    currentAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.CURRENT_AMOUNT,
    monthlyContribution: SAVINGS_CONSTANTS.FORM_DEFAULTS.MONTHLY_CONTRIBUTION,
    startDate: new Date(),
    completed: SAVINGS_CONSTANTS.FORM_DEFAULTS.COMPLETED,
    calculateByDate: false,
  }));
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });

  const toast = useToast();
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    loadGoals();
    const handler = () => loadGoals();
    window.addEventListener('dbTypeChanged', handler as EventListener);
    return () => window.removeEventListener('dbTypeChanged', handler as EventListener);
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const savedGoals = await getAllSavingsGoals();
      setGoals(savedGoals);
    } catch (error) {
      console.error(SAVINGS_CONSTANTS.MESSAGES.LOADING_ERROR, error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGoals = goals.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchText.toLowerCase()) ||
      g.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && g.completed) ||
      (statusFilter === 'in_progress' && !g.completed);
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (goal?: SavingsGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setFormData({
        name: goal.name,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        monthlyContribution: goal.monthlyContribution,
        startDate: new Date(goal.startDate),
        targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
        completed: goal.completed,
        calculateByDate: false,
      });
    } else {
      setSelectedGoal(null);
      setFormData({
        name: SAVINGS_CONSTANTS.FORM_DEFAULTS.NAME,
        description: SAVINGS_CONSTANTS.FORM_DEFAULTS.DESCRIPTION,
        targetAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.TARGET_AMOUNT,
        currentAmount: SAVINGS_CONSTANTS.FORM_DEFAULTS.CURRENT_AMOUNT,
        monthlyContribution: SAVINGS_CONSTANTS.FORM_DEFAULTS.MONTHLY_CONTRIBUTION,
        startDate: new Date(),
        completed: SAVINGS_CONSTANTS.FORM_DEFAULTS.COMPLETED,
        calculateByDate: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let updatedFormData = { ...formData };

      if (formData.calculateByDate && formData.targetDate) {
        const calculatedContribution = calculateMonthlyContribution(
          formData.currentAmount,
          formData.targetAmount,
          formData.targetDate,
          formData.startDate
        );
        updatedFormData.monthlyContribution = calculatedContribution;
      } else {
        const { estimatedDate } = calculateEstimatedCompletion(
          formData.currentAmount,
          formData.targetAmount,
          formData.monthlyContribution,
          formData.startDate
        );
        updatedFormData.targetDate = estimatedDate;
      }

      const { calculateByDate, ...goalData } = updatedFormData;
      void calculateByDate;

      if (selectedGoal?.id) {
        await updateSavingsGoal({ ...goalData, id: selectedGoal.id });
        toast.success('Meta guardada');
      } else {
        await addSavingsGoal(goalData);
        toast.success('Meta guardada');
      }
      await loadGoals();
      handleCloseDialog();
    } catch (error) {
      console.error(SAVINGS_CONSTANTS.MESSAGES.SAVE_ERROR, error);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    if (confirmState.id !== null) {
      try {
        await deleteSavingsGoal(confirmState.id);
        await loadGoals();
        toast.success('Meta eliminada');
      } catch (error) {
        console.error(SAVINGS_CONSTANTS.MESSAGES.DELETE_ERROR, error);
      }
    }
    setConfirmState({ open: false, id: null });
  };

  // Summary calculations
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
  const totalMonthly = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);

  return (
    <Box>
      {/* Summary cards */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <SummaryCard label="Total objetivo" value={totalTarget} isCurrency tone="primary" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard label="Total actual" value={totalCurrent} isCurrency tone="success" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Progreso global"
            value={`${totalProgress}%`}
            tone={totalProgress >= 100 ? 'success' : 'default'}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard label="Aporte mensual" value={totalMonthly} isCurrency tone="warning" />
        </Grid>
      </Grid>

      {/* Search and status filter */}
      <Box sx={{ mb: 2 }}>
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
            placeholder="Buscar por nombre o descripción…"
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
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {(['all', 'in_progress', 'completed'] as const).map((f) => {
            const labels = { all: 'Todas', in_progress: 'En progreso', completed: 'Completadas' };
            return (
              <Chip
                key={f}
                label={labels[f]}
                size="small"
                onClick={() => setStatusFilter(f)}
                variant={statusFilter === f ? 'filled' : 'outlined'}
                color={statusFilter === f ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Box>
      </Box>

      {isMobile ? (
        <Box>
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={120}
                  sx={{ borderRadius: 3, mb: 1 }}
                />
              ))}
            </>
          ) : filteredGoals.length === 0 ? (
            <EmptyState
              icon={<SavingsIcon />}
              title="No tienes metas de ahorro"
              description="Crea tu primera meta de ahorro para empezar"
              action={
                <Button variant="contained" onClick={() => handleOpenDialog()}>
                  Nueva meta
                </Button>
              }
            />
          ) : (
            filteredGoals.map((goal) => {
              const percent =
                goal.targetAmount > 0
                  ? Math.min(
                      Math.round((goal.currentAmount / goal.targetAmount) * 100),
                      100
                    )
                  : 0;
              return (
                <SwipeableCard
                  key={goal.id}
                  onDelete={() => goal.id && handleDelete(goal.id)}
                  disabled={false}
                >
                  <Card
                    variant="outlined"
                    sx={{ mb: 0, borderRadius: '20px', border: `1px solid ${t.border}` }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: t.textPrimary, flex: 1, pr: 1 }}
                        >
                          {goal.name}
                        </Typography>
                        <StatusChip
                          status={goal.completed ? 'completed' : 'in_progress'}
                          size="small"
                        />
                      </Box>

                      {goal.description && (
                        <Typography
                          variant="caption"
                          sx={{ color: t.textSecondary, display: 'block', mb: 1 }}
                        >
                          {goal.description}
                        </Typography>
                      )}

                      <Box sx={{ mb: 1 }}>
                        <ProgressBar
                          current={goal.currentAmount}
                          target={goal.targetAmount}
                          completed={goal.completed}
                        />
                      </Box>

                      <Typography variant="caption" sx={{ color: t.textSecondary }}>
                        {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}{' '}
                        · {percent}% completado
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: t.textMuted }}>
                          Aporte: {formatCurrency(goal.monthlyContribution)}/mes
                        </Typography>
                        {goal.targetDate && (
                          <Typography variant="caption" sx={{ color: t.textMuted }}>
                            Objetivo: <DateDisplay date={goal.targetDate} />
                          </Typography>
                        )}
                      </Box>

                      <Divider sx={{ my: 1, borderColor: t.border }} />

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(goal)}
                          sx={{ color: t.primary }}
                        >
                          <EditIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => goal.id && handleDelete(goal.id)}
                          sx={{ color: t.danger }}
                        >
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
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
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : filteredGoals.length === 0 ? (
            <EmptyState
              icon={<SavingsIcon />}
              title="No tienes metas de ahorro"
              description="Crea tu primera meta de ahorro para empezar"
              action={
                <Button variant="contained" onClick={() => handleOpenDialog()}>
                  Nueva meta
                </Button>
              }
            />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: t.surfaceSoft }}>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Nombre
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Descripción
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Objetivo
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Actual
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Aporte Mensual
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Restante
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Progreso
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Fecha Actual
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Fecha Objetivo
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Tiempo Restante
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredGoals.map((goal) => (
                  <TableRow
                    key={goal.id}
                    sx={{ '&:hover td': { backgroundColor: t.surfaceSoft }, transition: 'background 0.1s' }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{goal.name}</TableCell>
                    <TableCell sx={{ color: t.textSecondary }}>{goal.description}</TableCell>
                    <TableCell align="right">{formatCurrency(goal.targetAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(goal.currentAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(goal.monthlyContribution)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}
                    </TableCell>
                    <TableCell>
                      <ProgressBar
                        current={goal.currentAmount}
                        target={goal.targetAmount}
                        completed={goal.completed}
                      />
                    </TableCell>
                    <TableCell>
                      <DateDisplay date={goal.startDate} />
                    </TableCell>
                    <TableCell>
                      <DateDisplay date={goal.targetDate} />
                    </TableCell>
                    <TableCell>
                      {calculateTimeRemaining(
                        goal.currentAmount,
                        goal.targetAmount,
                        goal.monthlyContribution,
                        new Date(goal.startDate),
                        goal.targetDate ? new Date(goal.targetDate) : undefined
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={() => handleOpenDialog(goal)}
                        size="small"
                        sx={{ color: t.primary }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => goal.id && handleDelete(goal.id)}
                        size="small"
                        sx={{ color: t.danger }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <SavingsSummaryRow goals={filteredGoals} />
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      {/* FAB verde para añadir objetivo */}
      <Tooltip title="Nuevo objetivo" placement="left">
        <Fab
          aria-label="Nuevo objetivo"
          size="small"
          onClick={() => handleOpenDialog()}
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

      {/* Dialog para nueva/editar meta */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { borderRadius: 0, margin: 0, maxHeight: '100%' } : undefined,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {selectedGoal ? 'Editar Objetivo de Ahorro' : 'Nuevo Objetivo de Ahorro'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <FormSection title="Datos básicos">
              <TextField
                label="Nombre"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label="Descripción"
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </FormSection>

            <FormSection title="Cantidades">
              <TextField
                label="Cantidad Objetivo"
                type="number"
                fullWidth
                value={formData.targetAmount}
                onChange={(e) =>
                  setFormData({ ...formData, targetAmount: Number(e.target.value) })
                }
                required
              />
              <TextField
                label="Cantidad Actual"
                type="number"
                fullWidth
                value={formData.currentAmount}
                onChange={(e) =>
                  setFormData({ ...formData, currentAmount: Number(e.target.value) })
                }
                required
              />
              <TextField
                label="Aporte Mensual"
                type="number"
                fullWidth
                value={formData.monthlyContribution}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    monthlyContribution: Number(e.target.value),
                  })
                }
                required
                disabled={formData.calculateByDate}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.calculateByDate || false}
                    onChange={(e) =>
                      setFormData({ ...formData, calculateByDate: e.target.checked })
                    }
                  />
                }
                label="Calcular aporte mensual basado en fecha objetivo"
              />
            </FormSection>

            <FormSection title="Fechas">
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Fecha Actual"
                  value={formData.startDate}
                  onChange={(newDate) =>
                    setFormData({ ...formData, startDate: newDate || new Date() })
                  }
                  format="dd/MM/yyyy"
                />
              </LocalizationProvider>
              {formData.calculateByDate && (
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                  <DatePicker
                    label="Fecha Objetivo"
                    value={formData.targetDate || null}
                    onChange={(newDate) =>
                      setFormData({ ...formData, targetDate: newDate || undefined })
                    }
                    format="dd/MM/yyyy"
                    minDate={formData.startDate}
                  />
                </LocalizationProvider>
              )}
            </FormSection>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              pb: isMobile ? 3 : 2,
              gap: 1,
              ...(isMobile && {
                position: 'sticky',
                bottom: 0,
                backgroundColor: t.surface,
                borderTop: `1px solid ${t.border}`,
              }),
            }}
          >
            <Button onClick={handleCloseDialog} variant="outlined" sx={{ borderRadius: '12px' }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ borderRadius: '12px', flex: isMobile ? 1 : undefined }}
            >
              {selectedGoal ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        title="Eliminar objetivo de ahorro"
        description={SAVINGS_CONSTANTS.MESSAGES.DELETE_CONFIRMATION}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmState({ open: false, id: null })}
        destructive
      />
    </Box>
  );
}
