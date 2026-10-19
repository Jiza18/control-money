import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Divider,
  Tooltip,
  Fab,
  Skeleton,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
import { formatPercentage } from '../utils/formatters';
import { SAVINGS_CONSTANTS } from '../constants/savings';
import ProgressBar from './ProgressBar';
import DateDisplay from './DateDisplay';
import SavingsSummaryRow from './SavingsSummaryRow';
import {
  SummaryCard,
  StatusChip,
  EmptyState,
  ConfirmDialog,
  FormSection,
  SwipeableCard,
  PageHeader,
  MoneyAmount,
} from './ui';
import { tokens } from '../theme';
import { useToast } from '../contexts/ToastContext';

const statusLabels = { all: 'Todas', in_progress: 'En progreso', completed: 'Completadas' } as const;

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
  const completedCount = goals.filter((g) => g.completed).length;

  const emptyState = (
    <Box
      sx={{
        borderRadius: '14px',
        border: `1px dashed ${t.borderStrong}`,
        backgroundColor: t.surface,
      }}
    >
      <EmptyState
        icon={<SavingsOutlinedIcon />}
        title={goals.length === 0 ? 'No tienes metas de ahorro' : 'Ninguna meta coincide'}
        description={
          goals.length === 0
            ? 'Crea tu primera meta de ahorro para empezar'
            : 'Prueba con otra búsqueda o cambia el filtro de estado'
        }
        action={
          goals.length === 0 ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpenDialog()}>
              Nueva meta
            </Button>
          ) : undefined
        }
      />
    </Box>
  );

  const renderGoalCard = (goal: SavingsGoal) => {
    const percent =
      goal.targetAmount > 0
        ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
        : 0;
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const timeRemaining = calculateTimeRemaining(
      goal.currentAmount,
      goal.targetAmount,
      goal.monthlyContribution,
      new Date(goal.startDate),
      goal.targetDate ? new Date(goal.targetDate) : undefined
    );

    const meta = [
      { label: 'Aporte mensual', value: <><MoneyAmount value={goal.monthlyContribution} size="sm" /><Box component="span" sx={{ color: t.textMuted, fontSize: '0.8125rem' }}> /mes</Box></> },
      { label: 'Restante', value: <MoneyAmount value={remaining} size="sm" /> },
      { label: 'Fecha objetivo', value: <DateDisplay date={goal.targetDate} sx={{ fontWeight: 600, fontSize: '0.875rem' }} /> },
      { label: 'Tiempo restante', value: <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{timeRemaining}</Typography> },
    ];

    const card = (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2.25,
          borderRadius: '14px',
          border: `1px solid ${t.border}`,
          backgroundColor: t.surface,
          boxShadow: t.shadowSm,
          transition: 'border-color .15s, box-shadow .15s',
          '&:hover': { borderColor: t.borderStrong, boxShadow: t.shadowMd },
        }}
      >
        {/* Cabecera */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: goal.completed ? t.successSoft : t.primarySoft,
              color: goal.completed ? t.success : t.primary,
            }}
          >
            {goal.completed ? <CheckCircleOutlineRoundedIcon fontSize="small" /> : <FlagOutlinedIcon fontSize="small" />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}
            >
              {goal.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: goal.description ? t.textSecondary : t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {goal.description || 'Sin descripción'}
            </Typography>
          </Box>
          <StatusChip status={goal.completed ? 'completed' : 'in_progress'} />
        </Box>

        {/* Importe y progreso */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0, flexWrap: 'wrap' }}>
              <MoneyAmount value={goal.currentAmount} size="lg" />
              <Typography variant="body2" component="span" sx={{ color: t.textMuted, whiteSpace: 'nowrap' }}>
                de <MoneyAmount value={goal.targetAmount} size="sm" tone="muted" weight={500} />
              </Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.9375rem',
                fontVariantNumeric: 'tabular-nums',
                color: percent >= 100 ? t.success : t.textPrimary,
              }}
            >
              {formatPercentage(percent)}
            </Typography>
          </Box>
          <ProgressBar
            current={goal.currentAmount}
            target={goal.targetAmount}
            completed={goal.completed}
            height={8}
            showPercentage={false}
          />
        </Box>

        {/* Datos */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            columnGap: 2,
            rowGap: 1.5,
            p: 1.5,
            borderRadius: '10px',
            backgroundColor: t.surfaceSoft,
          }}
        >
          {meta.map((m) => (
            <Box key={m.label} sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted, lineHeight: 1.3 }}>
                {m.label}
              </Typography>
              <Box sx={{ color: t.textPrimary, lineHeight: 1.4 }}>{m.value}</Box>
            </Box>
          ))}
        </Box>

        {/* Pie */}
        <Box sx={{ mt: 'auto' }}>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: t.textMuted }}>
              <EventRepeatOutlinedIcon sx={{ fontSize: '0.95rem' }} />
              Desde <DateDisplay date={goal.startDate} />
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.25, mr: -0.75 }}>
              <Tooltip title="Editar meta">
                <IconButton aria-label={`Editar ${goal.name}`} onClick={() => handleOpenDialog(goal)} sx={{ width: 40, height: 40 }}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar meta">
                <IconButton
                  aria-label={`Eliminar ${goal.name}`}
                  onClick={() => goal.id && handleDelete(goal.id)}
                  sx={{ width: 40, height: 40, '&:hover': { color: t.danger, backgroundColor: t.dangerSoft } }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>
    );

    return isMobile ? (
      <SwipeableCard key={goal.id} onDelete={() => goal.id && handleDelete(goal.id)} disabled={false}>
        {card}
      </SwipeableCard>
    ) : (
      <Box key={goal.id}>{card}</Box>
    );
  };

  return (
    <Box>
      <PageHeader
        title="Ahorros"
        subtitle={
          goals.length > 0
            ? `${goals.length} ${goals.length === 1 ? 'meta' : 'metas'} · ${completedCount} ${completedCount === 1 ? 'completada' : 'completadas'}`
            : 'Define metas y sigue cuánto te falta para alcanzarlas'
        }
        actions={
          !isMobile ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpenDialog()}>
              Nueva meta
            </Button>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: '1.6fr 1fr 1fr' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, minWidth: 0 }}>
          <SummaryCard
            label="Total ahorrado"
            value={totalCurrent}
            isCurrency
            variant="hero"
            icon={<SavingsOutlinedIcon />}
            helperText={
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <span>Progreso global</span>
                  <Box component="span" sx={{ fontWeight: 700, color: 'common.white', fontVariantNumeric: 'tabular-nums' }}>
                    {totalProgress}%
                  </Box>
                </Box>
                <Box sx={{ height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.min(totalProgress, 100)}%`,
                      borderRadius: 99,
                      backgroundColor: 'common.white',
                      transition: 'width .4s ease',
                    }}
                  />
                </Box>
              </Box>
            }
          />
        </Box>
        <SummaryCard
          label="Total objetivo"
          value={totalTarget}
          isCurrency
          icon={isMobile ? undefined : <FlagOutlinedIcon />}
          tone="primary"
        />
        <SummaryCard
          label="Aporte mensual"
          value={totalMonthly}
          isCurrency
          icon={isMobile ? undefined : <EventRepeatOutlinedIcon />}
          tone="primary"
          helperText="Entre todas las metas"
        />
      </Box>

      {/* Search and status filter */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Buscar por nombre o descripción…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          inputProps={{ 'aria-label': 'Buscar metas' }}
          sx={{ width: { xs: '100%', sm: 340 }, '& .MuiOutlinedInput-root': { minHeight: 40 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton size="small" edge="end" aria-label="Limpiar búsqueda" onClick={() => setSearchText('')}>
                  <CloseRoundedIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={statusFilter}
          onChange={(_, value) => value && setStatusFilter(value)}
          aria-label="Filtrar por estado"
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'none' }, minHeight: 34 } }}
        >
          {(['all', 'in_progress', 'completed'] as const).map((f) => (
            <ToggleButton key={f} value={f}>
              {statusLabels[f]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Goals */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={260} sx={{ borderRadius: '14px' }} />
          ))}
        </Box>
      ) : filteredGoals.length === 0 ? (
        emptyState
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
              gap: { xs: 0, sm: 1.5 },
            }}
          >
            {filteredGoals.map(renderGoalCard)}
          </Box>
          <SavingsSummaryRow goals={filteredGoals} />
        </>
      )}

      {/* FAB para añadir objetivo (móvil) */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="Nueva meta"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            right: 'calc(env(safe-area-inset-right) + 16px)',
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
            zIndex: 1000,
          }}
        >
          <AddRoundedIcon />
        </Fab>
      )}

      {/* Dialog para nueva/editar meta */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { borderRadius: 0, margin: 0, maxHeight: '100%', border: 0 } : undefined,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <DialogTitle>
            {selectedGoal ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
            <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.5 }}>
              Indica el aporte mensual o una fecha objetivo y calculamos el resto.
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '12px !important' }}>
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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Cantidad objetivo"
                  type="number"
                  fullWidth
                  value={formData.targetAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, targetAmount: Number(e.target.value) })
                  }
                  required
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                />
                <TextField
                  label="Cantidad actual"
                  type="number"
                  fullWidth
                  value={formData.currentAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, currentAmount: Number(e.target.value) })
                  }
                  required
                  inputProps={{ inputMode: 'decimal' }}
                  InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
                />
              </Box>
              <TextField
                label="Aporte mensual"
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
                helperText={formData.calculateByDate ? 'Se calculará a partir de la fecha objetivo' : undefined}
                inputProps={{ inputMode: 'decimal' }}
                InputProps={{ endAdornment: <InputAdornment position="end">€/mes</InputAdornment> }}
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
                label={
                  <Typography variant="body2" sx={{ color: t.textPrimary }}>
                    Calcular el aporte mensual a partir de una fecha objetivo
                  </Typography>
                }
                sx={{
                  mx: 0,
                  px: 1,
                  py: 0.5,
                  borderRadius: '10px',
                  border: `1px solid ${t.border}`,
                  backgroundColor: formData.calculateByDate ? t.primarySoft : 'transparent',
                }}
              />
            </FormSection>

            <FormSection title="Fechas">
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: formData.calculateByDate ? '1fr 1fr' : '1fr' }, gap: 2 }}>
                  <DatePicker
                    label="Fecha de inicio"
                    value={formData.startDate}
                    onChange={(newDate) =>
                      setFormData({ ...formData, startDate: newDate || new Date() })
                    }
                    format="dd/MM/yyyy"
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  {formData.calculateByDate && (
                    <DatePicker
                      label="Fecha objetivo"
                      value={formData.targetDate || null}
                      onChange={(newDate) =>
                        setFormData({ ...formData, targetDate: newDate || undefined })
                      }
                      format="dd/MM/yyyy"
                      minDate={formData.startDate}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                </Box>
              </LocalizationProvider>
            </FormSection>
          </DialogContent>
          <DialogActions
            sx={{
              ...(isMobile && {
                position: 'sticky',
                bottom: 0,
                mt: 'auto',
                backgroundColor: t.surface,
                borderTop: `1px solid ${t.border}`,
                pb: 'calc(env(safe-area-inset-bottom) + 16px)',
              }),
            }}
          >
            <Button onClick={handleCloseDialog} variant="outlined" color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{ flex: isMobile ? 1 : undefined }}
            >
              {selectedGoal ? 'Guardar cambios' : 'Crear meta'}
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
