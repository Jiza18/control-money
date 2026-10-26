import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { Account, Expense, MonthPlan } from './config';
import { getCurrentRepository, getExpensesByMonth } from './repositoryAdapter';
import { adjustAccountBalance, applyToBalance, hasBalance } from './accountBalances';

// Previsión de meses futuros encadenada: cada mes empieza con lo que le quede al anterior.
//
//   Fin del mes actual = saldo actual − pendientes del mes
//   Inicio del mes M   = fin de M−1 + nómina de M (se cobra el día 1)
//   Fin del mes M      = inicio de M − pendientes de M
//
// Por cuenta igual, pero en lugar de la nómina entera cada cuenta recibe lo que se le reparte.
// Lo que no se reparte queda «sin repartir» y solo cuenta en el total.

export const MONTH_PLAN_CHANGED_EVENT = 'monthPlanChanged';

const round2 = (value: number) => Math.round(value * 100) / 100;

export const monthKey = (date: Date) => format(date, 'yyyy-MM');

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

export const isFutureMonth = (month: Date, today: Date = new Date()) => monthIndex(month) > monthIndex(today);

export interface AccountForecast {
  accountId: number;
  name: string;
  color: string;
  carry: number; // Lo que le queda del mes anterior
  distributed: number; // Lo que se le reparte este mes
  expenses: number; // Pendiente del mes con esta cuenta
  end: number; // Lo que le quedará a fin de mes
}

export interface MonthForecast {
  month: Date;
  carry: number; // Lo que queda del mes anterior (total)
  income: number;
  incomeIsEstimate: boolean; // true si no hay nómina guardada para el mes (se usa la habitual)
  start: number; // carry + income
  expenses: number; // Pendiente total del mes
  end: number; // start − expenses
  distributed: number;
  unassigned: number; // Nómina sin repartir (negativa si se reparte de más)
  otherExpenses: number; // Pendiente sin cuenta (o con cuenta sin saldo): solo resta del total
  accounts: AccountForecast[];
}

export interface ProjectionInput {
  today: Date;
  totalBalance: number; // Saldo actual global
  defaultIncome: number; // Ingresos mensuales habituales
  accounts: Account[];
  plans: MonthPlan[];
  // Gastos de cada mes desde el actual (índice 0) hasta el último proyectado, tal como los da getExpensesByMonth
  expensesByMonth: Expense[][];
}

function isPaidIn(expense: Expense, month: Date) {
  if (expense.frequency === 'one-time') {
    return Boolean(expense.isPaid) || Boolean(expense.paymentHistory?.some((r) => isSameMonth(new Date(r.date), month) && r.isPaid));
  }
  return Boolean(expense.isPaid);
}

// Lo pendiente de un mes, en total y por cuenta con saldo. Lo ya pagado no cuenta: o ya se
// descontó del saldo de su cuenta o ya no está en el saldo actual.
function pendingOf(expenses: Expense[], month: Date, tracked: Set<number>) {
  let total = 0;
  let other = 0;
  const byAccount = new Map<number, number>();
  for (const e of expenses) {
    if (isPaidIn(e, month)) continue;
    total += e.amount;
    if (e.accountId != null && tracked.has(e.accountId)) {
      byAccount.set(e.accountId, (byAccount.get(e.accountId) ?? 0) + e.amount);
    } else {
      other += e.amount;
    }
  }
  return { total, other, byAccount };
}

// Todos los meses desde el actual (índice 0) hasta el último de expensesByMonth
export function projectMonths(input: ProjectionInput): MonthForecast[] {
  const tracked = input.accounts.filter(hasBalance);
  const trackedIds = new Set(tracked.map((a) => a.id!));
  const plans = new Map(input.plans.map((p) => [p.month, p]));
  const result: MonthForecast[] = [];

  let prevEnd = 0;
  let prevAccountEnd = new Map<number, number>();

  input.expensesByMonth.forEach((expenses, i) => {
    const month = startOfMonth(addMonths(input.today, i));
    const pending = pendingOf(expenses, month, trackedIds);

    if (i === 0) {
      // Mes en curso: la nómina ya está en el saldo actual (se cobra el día 1)
      const accounts = tracked.map((a) => {
        const exp = pending.byAccount.get(a.id!) ?? 0;
        return { accountId: a.id!, name: a.name, color: a.color, carry: a.balance, distributed: 0, expenses: round2(exp), end: round2(a.balance - exp) };
      });
      const end = round2(input.totalBalance - pending.total);
      result.push({
        month, carry: input.totalBalance, income: 0, incomeIsEstimate: false, start: input.totalBalance,
        expenses: round2(pending.total), end, distributed: 0, unassigned: 0, otherExpenses: round2(pending.other), accounts,
      });
      prevEnd = end;
      prevAccountEnd = new Map(accounts.map((a) => [a.accountId, a.end]));
      return;
    }

    const plan = plans.get(monthKey(month));
    const income = plan?.income ?? input.defaultIncome;
    const share = new Map<number, number>();
    for (const d of plan?.distribution ?? []) {
      if (trackedIds.has(d.accountId)) share.set(d.accountId, (share.get(d.accountId) ?? 0) + d.amount);
    }

    const accounts = tracked.map((a) => {
      const carry = prevAccountEnd.get(a.id!) ?? 0;
      const distributed = share.get(a.id!) ?? 0;
      const exp = pending.byAccount.get(a.id!) ?? 0;
      return {
        accountId: a.id!, name: a.name, color: a.color,
        carry: round2(carry), distributed: round2(distributed), expenses: round2(exp), end: round2(carry + distributed - exp),
      };
    });
    const distributed = round2(accounts.reduce((s, a) => s + a.distributed, 0));
    const start = round2(prevEnd + income);
    const end = round2(start - pending.total);

    result.push({
      month, carry: prevEnd, income: round2(income), incomeIsEstimate: plan?.income === undefined, start,
      expenses: round2(pending.total), end, distributed, unassigned: round2(income - distributed),
      otherExpenses: round2(pending.other), accounts,
    });
    prevEnd = end;
    prevAccountEnd = new Map(accounts.map((a) => [a.accountId, a.end]));
  });

  return result;
}

// Reparto que cubre justo los gastos de cada cuenta en el mes (lo que le falta tras su arrastre)
export function suggestDistribution(forecast: MonthForecast): { accountId: number; amount: number }[] {
  return forecast.accounts.map((a) => ({
    accountId: a.accountId,
    amount: Math.max(0, round2(a.expenses - a.carry)),
  }));
}

const MAX_MONTHS_AHEAD = 24;

// Previsión del mes `target` (y los anteriores hasta el actual) con los datos de la BD activa
export async function getMonthForecasts(target: Date, today: Date = new Date()): Promise<MonthForecast[]> {
  const repo = await getCurrentRepository();
  const ahead = Math.min(Math.max(monthIndex(target) - monthIndex(today), 0), MAX_MONTHS_AHEAD);
  const [balance, accounts, plans] = await Promise.all([
    repo.balance.getCurrent(),
    repo.accounts.findAll(),
    repo.monthPlans.findAll(),
  ]);
  const expensesByMonth: Expense[][] = [];
  for (let i = 0; i <= ahead; i++) {
    expensesByMonth.push(await getExpensesByMonth(addMonths(today, i)));
  }
  return projectMonths({
    today,
    totalBalance: balance?.amount ?? 0,
    defaultIncome: balance?.monthlyIncome ?? 0,
    accounts,
    plans,
    expensesByMonth,
  });
}

// Guarda la nómina y/o el reparto de un mes (crea el plan si no existe)
export async function saveMonthPlan(
  month: Date,
  changes: { income?: number | null; distribution?: MonthPlan['distribution'] }
): Promise<void> {
  const repo = await getCurrentRepository();
  const key = monthKey(month);
  const existing = await repo.monthPlans.findByMonth(key);
  const plan: Omit<MonthPlan, 'id'> = {
    ...existing,
    month: key,
    income: changes.income === null ? undefined : changes.income ?? existing?.income,
    distribution: changes.distribution ?? existing?.distribution ?? [],
    updatedAt: new Date(),
  };
  if (existing?.id) await repo.monthPlans.update({ ...plan, id: existing.id });
  else await repo.monthPlans.create(plan);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MONTH_PLAN_CHANGED_EVENT));
}

// --- «Ha llegado la nómina»: pasar el plan a los saldos reales

export interface PayrollInput {
  income: number;
  distribution: { accountId: number; amount: number }[];
  restAccountId?: number; // Cuenta en la que queda lo no repartido (p. ej. donde se cobra)
}

export async function getMonthPlan(month: Date) {
  const repo = await getCurrentRepository();
  return repo.monthPlans.findByMonth(monthKey(month));
}

async function savePlan(month: Date, changes: Partial<MonthPlan>): Promise<void> {
  const repo = await getCurrentRepository();
  const existing = await repo.monthPlans.findByMonth(monthKey(month));
  const plan: Omit<MonthPlan, 'id'> = {
    ...existing,
    month: monthKey(month),
    distribution: existing?.distribution ?? [],
    ...changes,
    updatedAt: new Date(),
  };
  if (existing?.id) await repo.monthPlans.update({ ...plan, id: existing.id });
  else await repo.monthPlans.create(plan);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MONTH_PLAN_CHANGED_EVENT));
}

// Suma a cada cuenta lo repartido y el resto a la cuenta elegida. Sin saldos por cuenta, suma la
// nómina al saldo actual. Guarda lo aplicado para poder deshacerlo.
export async function applyPayroll(month: Date, input: PayrollInput): Promise<void> {
  const repo = await getCurrentRepository();
  const tracked = (await repo.accounts.findAll()).filter(hasBalance);
  const trackedIds = new Set(tracked.map((a) => a.id!));
  const income = round2(input.income);

  const amounts = new Map<number, number>();
  for (const d of input.distribution) {
    if (d.amount > 0 && trackedIds.has(d.accountId)) amounts.set(d.accountId, (amounts.get(d.accountId) ?? 0) + d.amount);
  }
  const distributed = [...amounts.values()].reduce((sum, v) => sum + v, 0);
  if (distributed > income + 0.005) throw new Error('Repartes más de lo que has cobrado');
  const rest = round2(income - distributed);
  if (rest > 0 && input.restAccountId != null && trackedIds.has(input.restAccountId)) {
    amounts.set(input.restAccountId, (amounts.get(input.restAccountId) ?? 0) + rest);
  }

  const applied: { accountId: number; amount: number }[] = [];
  let appliedToTotal: number | undefined;
  if (tracked.length > 0) {
    for (const [accountId, amount] of amounts) {
      if (await adjustAccountBalance(accountId, round2(amount))) applied.push({ accountId, amount: round2(amount) });
    }
  } else if (income > 0) {
    await applyToBalance(income);
    appliedToTotal = income;
  }

  await savePlan(month, {
    income,
    distribution: input.distribution.filter((d) => d.amount > 0 && trackedIds.has(d.accountId)),
    appliedAt: new Date(),
    applied,
    appliedToTotal,
  });
}

// Deshace la nómina aplicada: resta de cada cuenta exactamente lo que se le sumó
export async function undoPayroll(month: Date): Promise<void> {
  const plan = await getMonthPlan(month);
  if (!plan?.appliedAt) return;
  for (const a of plan.applied ?? []) await adjustAccountBalance(a.accountId, -a.amount);
  if (plan.appliedToTotal) await applyToBalance(-plan.appliedToTotal);
  await savePlan(month, { appliedAt: undefined, applied: undefined, appliedToTotal: undefined });
}

// «Ya está en mis saldos»: se marca como aplicada sin tocar ningún saldo
export async function dismissPayroll(month: Date): Promise<void> {
  await savePlan(month, { appliedAt: new Date(), applied: [], appliedToTotal: undefined });
}
