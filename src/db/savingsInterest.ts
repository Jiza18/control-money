import { addMonths } from 'date-fns';
import { InterestFrequency, SavingsGoal, SavingsMovement } from './config';

// Cálculo de intereses de los ahorros remunerados.
// Como hacen los bancos: el interés se devenga a diario sobre el saldo de cada tramo y se
// capitaliza (se suma al saldo) al cierre de cada periodo según la frecuencia de la meta.

export const PERIOD_MONTHS: Record<InterestFrequency, number> = {
  annual: 12,
  'semi-annual': 6,
  quarterly: 3,
  monthly: 1,
};

export const FREQUENCY_LABELS: Record<InterestFrequency, string> = {
  annual: 'Anual',
  'semi-annual': 'Semestral',
  quarterly: 'Trimestral',
  monthly: 'Mensual',
};

const DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface InterestConfig {
  interestRate?: number;
  interestFrequency?: InterestFrequency;
  interestTaxRate?: number;
}

export function hasInterest(goal: InterestConfig): boolean {
  return (goal.interestRate ?? 0) > 0;
}

// Tipo anual neto de retención, en tanto por uno
export function netAnnualRate(goal: InterestConfig): number {
  const gross = (goal.interestRate ?? 0) / 100;
  const tax = Math.min(Math.max(goal.interestTaxRate ?? 0, 0), 100) / 100;
  return gross * (1 - tax);
}

function frequencyOf(goal: InterestConfig): InterestFrequency {
  return goal.interestFrequency ?? 'annual';
}

export function signedAmount(movement: Pick<SavingsMovement, 'type' | 'amount'>): number {
  return movement.type === 'withdrawal' ? -movement.amount : movement.amount;
}

// Saldo de la meta justo después del instante `at`, reconstruido desde el saldo actual
function balanceAt(currentAmount: number, movements: SavingsMovement[], at: Date): number {
  const later = movements
    .filter((m) => new Date(m.date).getTime() > at.getTime())
    .reduce((sum, m) => sum + signedAmount(m), 0);
  return currentAmount - later;
}

// Interés neto devengado entre `from` y `to` teniendo en cuenta los movimientos intermedios
export function accruedInterest(
  goal: SavingsGoal,
  movements: SavingsMovement[],
  from: Date,
  to: Date
): number {
  if (!hasInterest(goal) || to.getTime() <= from.getTime()) return 0;
  const rate = netAnnualRate(goal);

  const cuts = movements
    .map((m) => new Date(m.date).getTime())
    .filter((time) => time > from.getTime() && time < to.getTime())
    .sort((a, b) => a - b);
  const points = [from.getTime(), ...cuts, to.getTime()];

  let interest = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const balance = Math.max(balanceAt(goal.currentAmount, movements, new Date(points[i])), 0);
    const days = (points[i + 1] - points[i]) / DAY_MS;
    interest += (balance * rate * days) / 365;
  }
  return interest;
}

export interface InterestStatus {
  periodStart: Date; // Último cierre (o inicio del ahorro)
  periodEnd: Date; // Próximo cierre
  accrued: number; // Neto devengado en el periodo hasta hoy (o hasta el cierre si ya pasó)
  isDue: boolean; // El periodo ya cerró y falta registrar sus intereses
}

export function getInterestStatus(
  goal: SavingsGoal,
  movements: SavingsMovement[],
  now: Date = new Date()
): InterestStatus | null {
  if (!hasInterest(goal)) return null;

  // El periodo arranca en el último abono de intereses registrado o en la fecha de inicio
  const lastInterest = movements
    .filter((m) => m.type === 'interest')
    .map((m) => new Date(m.date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const periodStart = lastInterest ?? new Date(goal.startDate);
  const periodEnd = addMonths(periodStart, PERIOD_MONTHS[frequencyOf(goal)]);
  const isDue = now.getTime() >= periodEnd.getTime();
  const accrued = accruedInterest(goal, movements, periodStart, isDue ? periodEnd : now);

  return { periodStart, periodEnd, accrued: round2(accrued), isDue };
}

// --- Proyecciones (aporte mensual al final de cada mes, intereses al cierre de cada periodo)

const MAX_MONTHS = 1200;

function simulate(
  current: number,
  monthly: number,
  goal: InterestConfig,
  months: number,
  stopAt?: number
): { balance: number; month: number | null } {
  const monthlyRate = netAnnualRate(goal) / 12;
  const period = PERIOD_MONTHS[frequencyOf(goal)];
  let balance = current;
  let pending = 0;

  for (let month = 1; month <= months; month++) {
    pending += balance * monthlyRate;
    if (month % period === 0) {
      balance += pending;
      pending = 0;
    }
    balance += monthly;
    if (stopAt !== undefined && balance >= stopAt) return { balance, month };
  }
  return { balance, month: null };
}

// Meses hasta alcanzar el objetivo, o null si no se alcanza (sin aporte ni intereses, o más de 100 años)
export function monthsToTarget(
  current: number,
  target: number,
  monthly: number,
  goal: InterestConfig
): number | null {
  if (current >= target) return 0;
  if (monthly <= 0 && !hasInterest(goal)) return null;
  if (current <= 0 && monthly <= 0) return null;
  return simulate(current, monthly, goal, MAX_MONTHS, target).month;
}

// Aporte mensual necesario para llegar al objetivo en `months` meses (búsqueda binaria)
export function requiredMonthlyContribution(
  current: number,
  target: number,
  months: number,
  goal: InterestConfig
): number {
  if (months <= 0 || current >= target) return 0;
  if (simulate(current, 0, goal, months).balance >= target) return 0;

  let low = 0;
  let high = target;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (simulate(current, mid, goal, months).balance >= target) high = mid;
    else low = mid;
  }
  return Math.ceil(high * 100) / 100;
}
