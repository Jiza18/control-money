import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Fab,
  Stack,
  Skeleton,
  InputBase,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Investment } from '../db/config';
import {
  calculateMaturityValue,
  calculateDaysToMaturity,
  calculateTotalReturn,
} from '../db/investmentServices';
import {
  getInvestments as getAllInvestments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
} from '../db';
import { SummaryCard, StatusChip, EmptyState, ConfirmDialog, FormSection, SwipeableCard } from './ui';
import { tokens } from '../theme';
import { useToast } from '../contexts/ToastContext';

interface InvestmentFormData {
  name: string;
  type: Investment['type'];
  initialAmount: number;
  annualRate: number;
  startDate: Date;
  termMonths: number;
  compoundingFrequency: Investment['compoundingFrequency'];
  notes: string;
}

const initialFormData: InvestmentFormData = {
  name: '',
  type: 'fixed-deposit',
  initialAmount: 0,
  annualRate: 0,
  startDate: new Date(),
  termMonths: 12,
  compoundingFrequency: 'monthly',
  notes: '',
};

const investmentTypes = [
  { value: 'fixed-deposit', label: 'Depósito a Plazo Fijo' },
  { value: 'savings-account', label: 'Cuenta de Ahorros' },
  { value: 'government-bond', label: 'Bono del Estado' },
  { value: 'mutual-fund', label: 'Fondo Mutuo' },
  { value: 'other', label: 'Otro' },
];

const compoundingFrequencies = [
  { value: 'daily', label: 'Diario' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semi-annual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState<InvestmentFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Investment['type']>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const toast = useToast();
  const muiTheme = useTheme();
  const t = tokens[muiTheme.palette.mode];
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    loadInvestments();
    const handler = () => loadInvestments();
    window.addEventListener('dbTypeChanged', handler as EventListener);
    return () => window.removeEventListener('dbTypeChanged', handler as EventListener);
  }, []);

  const loadInvestments = async () => {
    try {
      setListLoading(true);
      const updatedData = await getAllInvestments();
      setInvestments(updatedData);
    } catch (err) {
      setError('Error al cargar las inversiones');
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const presentTypes = Array.from(new Set(investments.map((inv) => inv.type)));

  const filteredInvestments = investments.filter((inv) => {
    const matchesSearch =
      searchText === '' ||
      inv.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (inv.notes || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesType = typeFilter === 'all' || inv.type === typeFilter;
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && inv.isActive) ||
      (activeFilter === 'inactive' && !inv.isActive);
    return matchesSearch && matchesType && matchesActive;
  });

  const handleOpenDialog = (investment?: Investment) => {
    if (investment) {
      setEditingInvestment(investment);
      setFormData({
        name: investment.name,
        type: investment.type,
        initialAmount: investment.initialAmount,
        annualRate: investment.annualRate,
        startDate: investment.startDate,
        termMonths: investment.termMonths,
        compoundingFrequency: investment.compoundingFrequency,
        notes: investment.notes || '',
      });
    } else {
      setEditingInvestment(null);
      setFormData(initialFormData);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingInvestment(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (
        !formData.name ||
        formData.initialAmount <= 0 ||
        formData.annualRate < 0 ||
        !formData.startDate
      ) {
        setError('Por favor, completa todos los campos requeridos');
        return;
      }

      const startDate = formData.startDate;
      const maturityDate = new Date(startDate);
      maturityDate.setMonth(maturityDate.getMonth() + formData.termMonths);

      const investmentData: Omit<Investment, 'id'> = {
        name: formData.name,
        type: formData.type,
        initialAmount: formData.initialAmount,
        currentAmount: formData.initialAmount,
        annualRate: formData.annualRate,
        startDate,
        termMonths: formData.termMonths,
        maturityDate,
        compoundingFrequency: formData.compoundingFrequency,
        isActive: true,
        notes: formData.notes,
      };

      if (editingInvestment) {
        await updateInvestment({ ...investmentData, id: editingInvestment.id! });
        toast.success('Inversión guardada');
      } else {
        await addInvestment(investmentData);
        toast.success('Inversión guardada');
      }

      await loadInvestments();
      handleCloseDialog();
    } catch (err) {
      setError('Error al guardar la inversión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    if (confirmState.id !== null) {
      try {
        await deleteInvestment(confirmState.id);
        await loadInvestments();
        toast.success('Inversión eliminada');
      } catch (err) {
        setError('Error al eliminar la inversión');
        console.error(err);
      }
    }
    setConfirmState({ open: false, id: null });
  };

  const getTypeLabel = (type: Investment['type']) =>
    investmentTypes.find((t) => t.value === type)?.label || type;

  const getFrequencyLabel = (frequency: Investment['compoundingFrequency']) =>
    compoundingFrequencies.find((f) => f.value === frequency)?.label || frequency;

  // Totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.initialAmount, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentAmount, 0);
  const totalGains = totalCurrentValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary cards */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <SummaryCard label="Total invertido" value={totalInvested} isCurrency tone="primary" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard label="Valor actual" value={totalCurrentValue} isCurrency tone="success" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Ganancias"
            value={totalGains}
            isCurrency
            tone={totalGains >= 0 ? 'success' : 'danger'}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <SummaryCard
            label="Rendimiento"
            value={`${totalReturnPercentage.toFixed(2)}%`}
            tone={totalReturnPercentage >= 0 ? 'success' : 'danger'}
          />
        </Grid>
      </Grid>

      {/* Search and filters */}
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
            placeholder="Buscar inversión…"
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

        {/* Type chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            label="Todos"
            size="small"
            onClick={() => setTypeFilter('all')}
            variant={typeFilter === 'all' ? 'filled' : 'outlined'}
            color={typeFilter === 'all' ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
          {presentTypes.map((type) => (
            <Chip
              key={type}
              label={getTypeLabel(type)}
              size="small"
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              variant={typeFilter === type ? 'filled' : 'outlined'}
              color={typeFilter === type ? 'primary' : 'default'}
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Box>

        {/* Active/inactive chips */}
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {(['all', 'active', 'inactive'] as const).map((f) => {
            const labels = { all: 'Todos', active: 'Activas', inactive: 'Inactivas' };
            return (
              <Chip
                key={f}
                label={labels[f]}
                size="small"
                onClick={() => setActiveFilter(f)}
                variant={activeFilter === f ? 'filled' : 'outlined'}
                color={activeFilter === f ? 'primary' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Mobile cards / Desktop table */}
      {isMobile ? (
        <Box>
          {listLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={160}
                  sx={{ borderRadius: 3, mb: 1 }}
                />
              ))}
            </>
          ) : filteredInvestments.length === 0 ? (
            <EmptyState
              icon={<ShowChartIcon />}
              title="No hay inversiones registradas"
              description="Pulsa el botón + para añadir tu primera inversión"
            />
          ) : (
            filteredInvestments.map((investment) => {
              const daysToMaturity = calculateDaysToMaturity(investment);
              const { totalReturn, returnPercentage } = calculateTotalReturn(investment);
              const maturityValue = calculateMaturityValue(investment);

              return (
                <SwipeableCard
                  key={investment.id}
                  onDelete={() => handleDelete(investment.id!)}
                  disabled={false}
                >
                  <Card
                    variant="outlined"
                    sx={{ mb: 0, borderRadius: '20px', border: `1px solid ${t.border}` }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Header */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Box sx={{ flex: 1, pr: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: t.textPrimary }}
                          >
                            {investment.name}
                          </Typography>
                          {investment.notes && (
                            <Typography
                              variant="caption"
                              sx={{ color: t.textSecondary, display: 'block' }}
                            >
                              {investment.notes}
                            </Typography>
                          )}
                        </Box>
                        <StatusChip status={investment.isActive ? 'active' : 'inactive'} />
                      </Box>

                      {/* Type + info chips */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                        <Chip
                          size="small"
                          label={getTypeLabel(investment.type)}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            backgroundColor: t.primarySoft,
                            color: t.primary,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                        <Chip
                          size="small"
                          label={`${investment.termMonths} meses`}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            backgroundColor: t.surfaceSoft,
                            color: t.textSecondary,
                            border: `1px solid ${t.border}`,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                        <Chip
                          size="small"
                          label={`${investment.annualRate}% TAE`}
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

                      {/* Amounts */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 0.75,
                          px: 1.5,
                          py: 1,
                          borderRadius: '8px',
                          backgroundColor: t.surfaceSoft,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ color: t.textMuted }}>
                            Inversión inicial
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatCurrency(investment.initialAmount)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ color: t.textMuted }}>
                            Valor actual
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: t.success }}
                          >
                            {formatCurrency(investment.currentAmount)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mt: 0.5,
                        }}
                      >
                        <Chip
                          label={daysToMaturity > 0 ? `${daysToMaturity} días` : 'Vencido'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor:
                              daysToMaturity > 30
                                ? t.successSoft
                                : daysToMaturity > 0
                                ? t.warningSoft
                                : t.dangerSoft,
                            color:
                              daysToMaturity > 30
                                ? t.success
                                : daysToMaturity > 0
                                ? t.warning
                                : t.danger,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                        <Tooltip title={`Valor al vencimiento: ${formatCurrency(maturityValue)}`}>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: t.textPrimary }}
                            >
                              {formatCurrency(totalReturn)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: t.success }}>
                              +{returnPercentage.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>

                      <Divider sx={{ my: 1, borderColor: t.border }} />

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(investment)}
                          sx={{ color: t.primary }}
                        >
                          <EditIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(investment.id!)}
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
          {listLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : filteredInvestments.length === 0 ? (
            <EmptyState
              icon={<ShowChartIcon />}
              title="No hay inversiones registradas"
              description="Pulsa el botón + para añadir tu primera inversión"
            />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: t.surfaceSoft }}>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Nombre
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Tipo
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Inv. Inicial
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Valor Actual
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Tasa Anual
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Fecha Inicio
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Plazo
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Días Rest.
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Ganancia
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Estado
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: t.textSecondary, fontSize: '0.8rem' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvestments.map((investment) => {
                  const daysToMaturity = calculateDaysToMaturity(investment);
                  const { totalReturn, returnPercentage } = calculateTotalReturn(investment);
                  const maturityValue = calculateMaturityValue(investment);

                  return (
                    <TableRow
                      key={investment.id}
                      sx={{
                        '&:hover td': { backgroundColor: t.surfaceSoft },
                        transition: 'background 0.1s',
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {investment.name}
                          </Typography>
                          {investment.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {investment.notes}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        {getTypeLabel(investment.type)}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(investment.initialAmount)}</TableCell>
                      <TableCell align="right">{formatCurrency(investment.currentAmount)}</TableCell>
                      <TableCell align="right">{investment.annualRate}%</TableCell>
                      <TableCell align="center" sx={{ fontSize: '0.85rem', color: t.textSecondary }}>
                        {investment.startDate.toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2">{investment.termMonths} meses</Typography>
                          <Typography variant="caption" sx={{ color: t.textSecondary }}>
                            {getFrequencyLabel(investment.compoundingFrequency)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={daysToMaturity > 0 ? `${daysToMaturity} días` : 'Vencido'}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor:
                              daysToMaturity > 30
                                ? t.successSoft
                                : daysToMaturity > 0
                                ? t.warningSoft
                                : t.dangerSoft,
                            color:
                              daysToMaturity > 30
                                ? t.success
                                : daysToMaturity > 0
                                ? t.warning
                                : t.danger,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={`Valor al vencimiento: ${formatCurrency(maturityValue)}`}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {formatCurrency(totalReturn)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: t.success }}>
                              +{returnPercentage.toFixed(2)}%
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <StatusChip status={investment.isActive ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(investment)}
                            sx={{ color: t.primary }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(investment.id!)}
                            sx={{ color: t.danger }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      {/* FAB verde para añadir inversión */}
      <Tooltip title="Añadir inversión" placement="left">
        <Fab
          aria-label="Añadir inversión"
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

      {/* Dialog nueva/editar inversión */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { borderRadius: 0, margin: 0, maxHeight: '100%' } : undefined,
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingInvestment ? 'Editar Inversión' : 'Nueva Inversión'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}

          <FormSection title="Datos básicos">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre de la Inversión"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Inversión</InputLabel>
                  <Select
                    value={formData.type}
                    label="Tipo de Inversión"
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as Investment['type'] })
                    }
                  >
                    {investmentTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Monto y tasa">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Monto Inicial"
                  type="number"
                  value={formData.initialAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, initialAmount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tasa Anual (%)"
                  type="number"
                  value={formData.annualRate}
                  onChange={(e) =>
                    setFormData({ ...formData, annualRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Plazos">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fecha de Inicio"
                  type="date"
                  value={formData.startDate.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: new Date(e.target.value) })
                  }
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Plazo (meses)"
                  type="number"
                  value={formData.termMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, termMonths: parseInt(e.target.value) || 12 })
                  }
                  required
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frecuencia de Capitalización</InputLabel>
                  <Select
                    value={formData.compoundingFrequency}
                    label="Frecuencia de Capitalización"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        compoundingFrequency: e.target
                          .value as Investment['compoundingFrequency'],
                      })
                    }
                  >
                    {compoundingFrequencies.map((freq) => (
                      <MenuItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </FormSection>

          <FormSection title="Notas">
            <TextField
              fullWidth
              label="Notas (opcional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
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
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{ borderRadius: '12px', flex: isMobile ? 1 : undefined }}
          >
            {loading ? 'Guardando…' : editingInvestment ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        title="Eliminar inversión"
        description="¿Estás seguro de que quieres eliminar esta inversión? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmState({ open: false, id: null })}
        destructive
      />
    </Box>
  );
}
