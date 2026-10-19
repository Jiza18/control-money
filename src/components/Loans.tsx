import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  Skeleton,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
import DateDisplay from './DateDisplay';
import { tokens } from '../theme';
import { formatCurrency } from '../utils/formatters';
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

const formatRate = (rate: number) => `${rate.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`;

const formatSignedPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

// Días hasta el vencimiento como pastilla: verde con margen, ámbar el último mes, rojo vencida
function MaturityChip({ days }: { days: number }) {
  if (days <= 0) return <StatusChip status="overdue" label="Vencida" />;
  return <StatusChip status={days > 30 ? 'active' : 'pending'} label={`${days.toLocaleString('es-ES')} días`} />;
}

const statusLabels = { all: 'Todas', active: 'Activas', inactive: 'Inactivas' } as const;

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
  const activeCount = investments.filter((inv) => inv.isActive).length;

  const emptyState = (
    <Box sx={{ borderRadius: '14px', border: `1px dashed ${t.borderStrong}`, backgroundColor: t.surface }}>
      <EmptyState
        icon={<ShowChartRoundedIcon />}
        title={investments.length === 0 ? 'No hay inversiones registradas' : 'Ninguna inversión coincide'}
        description={
          investments.length === 0
            ? 'Añade depósitos, bonos o fondos para seguir su rentabilidad'
            : 'Prueba con otra búsqueda o cambia los filtros'
        }
        action={
          investments.length === 0 ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpenDialog()}>
              Nueva inversión
            </Button>
          ) : undefined
        }
      />
    </Box>
  );

  const rowActions = (investment: Investment) => (
    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
      <Tooltip title="Editar inversión">
        <IconButton aria-label={`Editar ${investment.name}`} onClick={() => handleOpenDialog(investment)} sx={{ width: 40, height: 40 }}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar inversión">
        <IconButton
          aria-label={`Eliminar ${investment.name}`}
          onClick={() => handleDelete(investment.id!)}
          sx={{ width: 40, height: 40, '&:hover': { color: t.danger, backgroundColor: t.dangerSoft } }}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const typeChip = (investment: Investment) => (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 1,
        borderRadius: '6px',
        backgroundColor: t.surfaceSoft,
        color: t.textSecondary,
        fontSize: '0.75rem',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {getTypeLabel(investment.type)}
    </Box>
  );

  const gainBlock = (investment: Investment, align: 'left' | 'right') => {
    const { totalReturn, returnPercentage } = calculateTotalReturn(investment);
    const maturityValue = calculateMaturityValue(investment);
    const positive = totalReturn >= 0;
    return (
      <Tooltip title={`Valor al vencimiento: ${formatCurrency(maturityValue)}`}>
        <Box sx={{ textAlign: align, cursor: 'help' }}>
          <MoneyAmount value={totalReturn} size="sm" tone={positive ? 'success' : 'danger'} />
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
              gap: 0.25,
              color: positive ? t.success : t.danger,
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {positive ? <TrendingUpRoundedIcon sx={{ fontSize: '0.9rem' }} /> : <TrendingDownRoundedIcon sx={{ fontSize: '0.9rem' }} />}
            {formatSignedPercent(returnPercentage)}
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  const renderMobileCard = (investment: Investment) => {
    const daysToMaturity = calculateDaysToMaturity(investment);
    return (
      <SwipeableCard key={investment.id} onDelete={() => handleDelete(investment.id!)} disabled={false}>
        <Box
          sx={{
            p: 2,
            borderRadius: '14px',
            border: `1px solid ${t.border}`,
            backgroundColor: t.surface,
            boxShadow: t.shadowSm,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.75,
          }}
        >
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
                backgroundColor: t.primarySoft,
                color: t.primary,
              }}
            >
              <AccountBalanceOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>
                {investment.name}
              </Typography>
              <Typography variant="body2" sx={{ color: t.textSecondary }}>
                {getTypeLabel(investment.type)}
              </Typography>
            </Box>
            <StatusChip status={investment.isActive ? 'active' : 'inactive'} />
          </Box>

          {investment.notes && (
            <Typography variant="body2" sx={{ color: t.textSecondary, mt: -0.75 }}>
              {investment.notes}
            </Typography>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1.5,
              p: 1.5,
              borderRadius: '10px',
              backgroundColor: t.surfaceSoft,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted }}>
                Invertido
              </Typography>
              <MoneyAmount value={investment.initialAmount} size="md" />
            </Box>
            <Box sx={{ minWidth: 0, textAlign: 'right' }}>
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted }}>
                Valor actual
              </Typography>
              <MoneyAmount value={investment.currentAmount} size="md" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted }}>
                Tasa · plazo
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {formatRate(investment.annualRate)} · {investment.termMonths} meses
              </Typography>
              <Typography variant="caption" sx={{ color: t.textMuted }}>
                Capitalización {getFrequencyLabel(investment.compoundingFrequency).toLowerCase()}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', color: t.textMuted, textAlign: 'right' }}>
                Ganancia esperada
              </Typography>
              {gainBlock(investment, 'right')}
            </Box>
          </Box>

          <Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <MaturityChip days={daysToMaturity} />
                <Typography variant="caption" sx={{ color: t.textMuted, whiteSpace: 'nowrap' }}>
                  desde <DateDisplay date={investment.startDate} />
                </Typography>
              </Box>
              <Box sx={{ mr: -0.75 }}>{rowActions(investment)}</Box>
            </Box>
          </Box>
        </Box>
      </SwipeableCard>
    );
  };

  return (
    <Box>
      <PageHeader
        title="Inversiones"
        subtitle={
          investments.length > 0
            ? `${investments.length} ${investments.length === 1 ? 'inversión' : 'inversiones'} · ${activeCount} ${activeCount === 1 ? 'activa' : 'activas'}`
            : 'Sigue la rentabilidad de tus depósitos, bonos y fondos'
        }
        actions={
          !isMobile ? (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => handleOpenDialog()}>
              Nueva inversión
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
            label="Valor actual"
            value={totalCurrentValue}
            isCurrency
            variant="hero"
            icon={<ShowChartRoundedIcon />}
            helperText={`${activeCount} ${activeCount === 1 ? 'inversión activa' : 'inversiones activas'}`}
          />
        </Box>
        <SummaryCard
          label="Total invertido"
          value={totalInvested}
          isCurrency
          tone="primary"
          icon={<PaymentsOutlinedIcon />}
        />
        <SummaryCard
          label="Ganancias"
          value={totalGains}
          isCurrency
          tone={totalGains >= 0 ? 'success' : 'danger'}
          icon={totalGains >= 0 ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
          helperText={`Rendimiento ${formatSignedPercent(totalReturnPercentage)}`}
        />
      </Box>

      {/* Search and filters */}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <TextField
            size="small"
            placeholder="Buscar inversión…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            inputProps={{ 'aria-label': 'Buscar inversiones' }}
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
            value={activeFilter}
            onChange={(_, value) => value && setActiveFilter(value)}
            aria-label="Filtrar por estado"
            sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'none' }, minHeight: 34 } }}
          >
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <ToggleButton key={f} value={f}>
                {statusLabels[f]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Type chips */}
        <Box
          role="group"
          aria-label="Filtrar por tipo"
          sx={{
            display: 'flex',
            gap: 0.75,
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflowX: { xs: 'auto', sm: 'visible' },
            mx: { xs: -2, sm: 0 },
            px: { xs: 2, sm: 0 },
            pb: { xs: 0.5, sm: 0 },
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Chip
            label="Todos los tipos"
            onClick={() => setTypeFilter('all')}
            variant={typeFilter === 'all' ? 'filled' : 'outlined'}
            color={typeFilter === 'all' ? 'primary' : 'default'}
            sx={{ flexShrink: 0, height: 32 }}
          />
          {presentTypes.map((type) => (
            <Chip
              key={type}
              label={getTypeLabel(type)}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              variant={typeFilter === type ? 'filled' : 'outlined'}
              color={typeFilter === type ? 'primary' : 'default'}
              sx={{ flexShrink: 0, height: 32 }}
            />
          ))}
        </Box>
      </Box>

      {/* Mobile cards / Desktop table */}
      {listLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={isMobile ? 200 : 64} sx={{ borderRadius: '14px' }} />
          ))}
        </Box>
      ) : filteredInvestments.length === 0 ? (
        emptyState
      ) : isMobile ? (
        <Box>{filteredInvestments.map(renderMobileCard)}</Box>
      ) : (
        <TableContainer sx={{ boxShadow: t.shadowSm }}>
          <Table sx={{ '& th, & td': { px: 1.5 }, '& th:first-of-type, & td:first-of-type': { pl: 2.5 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Inversión</TableCell>
                <TableCell align="right">Invertido</TableCell>
                <TableCell align="right">Valor actual</TableCell>
                <TableCell>Tasa y plazo</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell align="right">Ganancia</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right" sx={{ width: 96 }}>
                  <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                    Acciones
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvestments.map((investment) => {
                const daysToMaturity = calculateDaysToMaturity(investment);

                return (
                  <TableRow key={investment.id} hover>
                    <TableCell sx={{ minWidth: 180, maxWidth: 260 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: t.textPrimary }}>
                        {investment.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, minWidth: 0 }}>
                        {typeChip(investment)}
                        {investment.notes && (
                          <Typography
                            variant="caption"
                            sx={{ color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                            title={investment.notes}
                          >
                            {investment.notes}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <MoneyAmount value={investment.initialAmount} size="sm" weight={500} />
                    </TableCell>
                    <TableCell align="right">
                      <MoneyAmount value={investment.currentAmount} size="sm" />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {formatRate(investment.annualRate)} · {investment.termMonths} meses
                      </Typography>
                      <Typography variant="caption" sx={{ color: t.textMuted }}>
                        Capitalización {getFrequencyLabel(investment.compoundingFrequency).toLowerCase()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <MaturityChip days={daysToMaturity} />
                      <Typography variant="caption" component="div" sx={{ color: t.textMuted, mt: 0.5 }}>
                        desde <DateDisplay date={investment.startDate} />
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{gainBlock(investment, 'right')}</TableCell>
                    <TableCell>
                      <StatusChip status={investment.isActive ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, pr: '8px !important' }}>
                      {rowActions(investment)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* FAB para añadir inversión (móvil) */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="Nueva inversión"
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

      {/* Dialog nueva/editar inversión */}
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
        <DialogTitle>
          {editingInvestment ? 'Editar inversión' : 'Nueva inversión'}
          <Typography variant="body2" sx={{ color: t.textSecondary, mt: 0.5 }}>
            El valor al vencimiento se calcula con interés compuesto.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '12px !important' }}>
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <FormSection title="Datos básicos">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Nombre de la inversión"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <FormControl fullWidth>
                <InputLabel>Tipo de inversión</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo de inversión"
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
            </Box>
          </FormSection>

          <FormSection title="Importe y tasa">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Importe inicial"
                type="number"
                value={formData.initialAmount}
                onChange={(e) =>
                  setFormData({ ...formData, initialAmount: parseFloat(e.target.value) || 0 })
                }
                required
                inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
                InputProps={{ endAdornment: <InputAdornment position="end">€</InputAdornment> }}
              />
              <TextField
                fullWidth
                label="Tasa anual"
                type="number"
                value={formData.annualRate}
                onChange={(e) =>
                  setFormData({ ...formData, annualRate: parseFloat(e.target.value) || 0 })
                }
                required
                inputProps={{ min: 0, step: 0.01, inputMode: 'decimal' }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              />
            </Box>
          </FormSection>

          <FormSection title="Plazos">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                label="Fecha de inicio"
                type="date"
                value={formData.startDate.toISOString().split('T')[0]}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: new Date(e.target.value) })
                }
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="Plazo"
                type="number"
                value={formData.termMonths}
                onChange={(e) =>
                  setFormData({ ...formData, termMonths: parseInt(e.target.value) || 12 })
                }
                required
                inputProps={{ min: 1, inputMode: 'numeric' }}
                InputProps={{ endAdornment: <InputAdornment position="end">meses</InputAdornment> }}
              />
              <FormControl fullWidth sx={{ gridColumn: { sm: '1 / -1' } }}>
                <InputLabel>Frecuencia de capitalización</InputLabel>
                <Select
                  value={formData.compoundingFrequency}
                  label="Frecuencia de capitalización"
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
            </Box>
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
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            sx={{ flex: isMobile ? 1 : undefined }}
          >
            {loading ? 'Guardando…' : editingInvestment ? 'Guardar cambios' : 'Crear inversión'}
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
