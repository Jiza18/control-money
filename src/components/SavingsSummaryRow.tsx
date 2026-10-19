import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SavingsGoal } from '../db/config';
import { formatPercentage } from '../utils/formatters';
import { tokens } from '../theme';
import { MoneyAmount } from './ui';
import ProgressBar from './ProgressBar';

interface SavingsSummaryRowProps {
  goals: SavingsGoal[];
}

// Resumen de totales de las metas visibles (objetivo, actual, aporte, restante y progreso)
export default function SavingsSummaryRow({ goals }: SavingsSummaryRowProps) {
  const theme = useTheme();
  const t = tokens[theme.palette.mode];
  
  if (goals.length === 0) {
    return null;
  }

  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalMonthly = goals.reduce((sum, goal) => sum + goal.monthlyContribution, 0);
  const totalRemaining = goals.reduce((sum, goal) => sum + Math.max(goal.targetAmount - goal.currentAmount, 0), 0);
  const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const stats = [
    { label: 'Objetivo', value: totalTarget },
    { label: 'Ahorrado', value: totalCurrent },
    { label: 'Aporte mensual', value: totalMonthly },
    { label: 'Restante', value: totalRemaining },
  ];

  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: '14px',
        border: `1px solid ${t.border}`,
        backgroundColor: t.surface,
        boxShadow: t.shadowSm,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 2 }}>
        <Typography variant="subtitle1" component="h2">
          Totales
        </Typography>
        <Typography variant="caption" sx={{ color: t.textMuted }}>
          {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr)) minmax(180px, 1.4fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'end',
        }}
      >
        {stats.map((s) => (
          <Box key={s.label} sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block', color: t.textSecondary, mb: 0.25 }}>
              {s.label}
            </Typography>
            <MoneyAmount value={s.value} size="md" />
          </Box>
        ))}
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: t.textSecondary }}>
              Progreso
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {formatPercentage(Math.round(totalProgress))}
            </Typography>
          </Box>
          <ProgressBar current={totalCurrent} target={totalTarget || 1} showPercentage={false} />
        </Box>
      </Box>
    </Box>
  );
}
