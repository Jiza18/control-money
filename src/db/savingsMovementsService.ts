import { isSameMonth, startOfMonth } from 'date-fns';
import { Expense, SavingsGoal, SavingsMovement } from './config';
import { getCurrentRepository } from './repositoryAdapter';
import { signedAmount } from './savingsInterest';

// Operaciones de movimientos de ahorro. Cada movimiento actualiza el saldo de la meta y, si
// afecta al saldo actual, lo descuenta (aportación) o lo devuelve (retirada).

export type NewSavingsMovement = Omit<SavingsMovement, 'id' | 'goalId'>;

// Evento para que el saldo de la barra lateral y la vista de gastos se recarguen
export const BALANCE_CHANGED_EVENT = 'balanceChanged';

const round2 = (value: number) => Math.round(value * 100) / 100;

// Categoría de gastos para los aportes mensuales a metas de ahorro
export const SAVINGS_CATEGORY = 'Ahorro';

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

export async function getSavingsMovements(goalId: number): Promise<SavingsMovement[]> {
  const repo = await getCurrentRepository();
  return repo.savingsMovements.findByGoal(goalId);
}

async function applyToBalance(delta: number): Promise<void> {
  const repo = await getCurrentRepository();
  const current = await repo.balance.getCurrent();
  const base = current ?? { amount: 0, monthlyIncome: 0, date: new Date() };
  const updated = { ...base, amount: round2(base.amount + delta), date: new Date() };
  if (current?.id) {
    await repo.balance.update({ ...updated, id: current.id });
  } else {
    await repo.balance.create(updated);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BALANCE_CHANGED_EVENT));
    document.dispatchEvent(new CustomEvent('balanceUpdated'));
  }
}

async function updateGoalAmount(goal: SavingsGoal, delta: number): Promise<SavingsGoal> {
  const repo = await getCurrentRepository();
  const currentAmount = round2(goal.currentAmount + delta);
  const updated: SavingsGoal = {
    ...goal,
    currentAmount,
    completed: goal.targetAmount > 0 && currentAmount >= goal.targetAmount,
  };
  return repo.savings.update(updated);
}

export async function addSavingsMovement(
  goal: SavingsGoal,
  input: NewSavingsMovement
): Promise<SavingsGoal> {
  if (!goal.id) throw new Error('La meta no tiene id');
  if (!(input.amount > 0)) throw new Error('El importe debe ser mayor que 0');
  if (input.type === 'withdrawal' && input.amount > goal.currentAmount + 0.005) {
    throw new Error('No puedes retirar más de lo ahorrado');
  }

  const repo = await getCurrentRepository();
  // Los intereses los abona el banco: nunca tocan el saldo actual
  const affectsBalance = input.type !== 'interest' && input.affectsBalance;
  const movement = { ...input, amount: round2(input.amount), affectsBalance, goalId: goal.id };
  await repo.savingsMovements.create(movement);

  const delta = signedAmount(movement);
  const updatedGoal = await updateGoalAmount(goal, delta);
  if (affectsBalance) await applyToBalance(-delta);
  if (movement.expenseId) await setExpenseMonthPaid(movement.expenseId, movement.date, true, movement.amount);
  if (updatedGoal.addToExpenses) await syncGoalExpense(updatedGoal);
  return updatedGoal;
}

// Deshace un movimiento: revierte el saldo de la meta y, si lo tocó, el saldo actual
export async function deleteSavingsMovement(
  goal: SavingsGoal,
  movement: SavingsMovement
): Promise<SavingsGoal> {
  if (!movement.id) throw new Error('El movimiento no tiene id');
  const repo = await getCurrentRepository();
  await repo.savingsMovements.delete(movement.id);

  const delta = signedAmount(movement);
  const updatedGoal = await updateGoalAmount(goal, -delta);
  if (movement.affectsBalance) await applyToBalance(delta);
  if (movement.expenseId) await setExpenseMonthPaid(movement.expenseId, new Date(movement.date), false);
  if (updatedGoal.addToExpenses) await syncGoalExpense(updatedGoal);
  return updatedGoal;
}

// Todos los movimientos agrupados por meta (para pintar el estado de intereses de cada tarjeta)
export async function getMovementsByGoal(): Promise<Record<number, SavingsMovement[]>> {
  const repo = await getCurrentRepository();
  const all = await repo.savingsMovements.findAll();
  return all.reduce<Record<number, SavingsMovement[]>>((acc, m) => {
    (acc[m.goalId] ??= []).push(m);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Aporte mensual como gasto fijo en Gastos (Expense.savingsGoalId ↔ SavingsMovement.expenseId)

export async function findGoalExpense(goalId: number): Promise<Expense | undefined> {
  const repo = await getCurrentRepository();
  return (await repo.expenses.findAll()).find((e) => e.savingsGoalId === goalId);
}

// Marca o desmarca como pagado el mes de `date` en el gasto (mismo formato que el check de Gastos)
async function setExpenseMonthPaid(expenseId: number, date: Date, isPaid: boolean, amount?: number): Promise<void> {
  const repo = await getCurrentRepository();
  const expense = await repo.expenses.findById(expenseId);
  if (!expense) return;
  const history = [...(expense.paymentHistory || [])];
  const index = history.findIndex((r) => isSameMonth(new Date(r.date), date));
  const record = {
    date,
    isPaid,
    amount: isPaid && amount !== undefined ? amount : index >= 0 ? history[index].amount : undefined,
  };
  if (index >= 0) history[index] = { ...history[index], ...record, date: history[index].date };
  else history.push(record);
  await repo.expenses.update({ ...expense, paymentHistory: history });
}

// ¿El gasto aparece en ese mes y está sin pagar?
export function isExpenseMonthPending(expense: Expense, date: Date): boolean {
  const diff = monthIndex(date) - monthIndex(new Date(expense.date));
  if (diff < 0 || (expense.duration && diff >= expense.duration)) return false;
  return !expense.paymentHistory?.some((r) => isSameMonth(new Date(r.date), date) && r.isPaid);
}

// Deja de mostrar el gasto: se borra si nunca se pagó; si no, se corta tras el último mes pagado
async function endGoalExpense(expense: Expense): Promise<void> {
  const repo = await getCurrentRepository();
  const now = new Date();
  const paidThisMonth = expense.paymentHistory?.some((r) => isSameMonth(new Date(r.date), now) && r.isPaid);
  const lastIncluded = monthIndex(now) - monthIndex(new Date(expense.date)) - (paidThisMonth ? 0 : 1);
  const everPaid = expense.paymentHistory?.some((r) => r.isPaid);
  if (!everPaid || lastIncluded < 0) {
    await repo.expenses.delete(expense.id!);
  } else if (expense.duration !== lastIncluded + 1) {
    await repo.expenses.update({ ...expense, duration: lastIncluded + 1 });
  }
}

// Crea, actualiza o termina el gasto de aporte mensual según la meta
export async function syncGoalExpense(goal: SavingsGoal): Promise<void> {
  if (!goal.id) return;
  const repo = await getCurrentRepository();
  const existing = await findGoalExpense(goal.id);
  const active = Boolean(goal.addToExpenses) && goal.monthlyContribution > 0 && !goal.completed;

  if (!active) {
    if (existing) await endGoalExpense(existing);
    return;
  }

  if (existing) {
    await repo.expenses.update({
      ...existing,
      description: goal.name,
      amount: round2(goal.monthlyContribution),
      category: SAVINGS_CATEGORY,
      frequency: 'monthly',
      duration: undefined,
    });
  } else {
    await repo.expenses.create({
      amount: round2(goal.monthlyContribution),
      category: SAVINGS_CATEGORY,
      description: goal.name,
      date: startOfMonth(new Date()),
      frequency: 'monthly',
      isPaid: false,
      paymentHistory: [],
      savingsGoalId: goal.id,
    });
  }
}

// Al borrar una meta su gasto deja de aparecer (los meses ya pagados se conservan)
export async function endExpenseForGoal(goalId: number): Promise<void> {
  const existing = await findGoalExpense(goalId);
  if (existing) await endGoalExpense(existing);
}

// Check de pagado en Gastos sobre un aporte mensual: aporta a la meta o deshace la aportación.
// Devuelve null si la meta ya no existe (el check funciona entonces como un gasto normal).
export async function toggleSavingsExpensePayment(
  expense: Expense,
  month: Date
): Promise<{ goal: SavingsGoal; paid: boolean; amount: number } | null> {
  if (!expense.id || !expense.savingsGoalId) return null;
  const repo = await getCurrentRepository();
  const goal = await repo.savings.findById(expense.savingsGoalId);
  if (!goal) return null;

  const record = expense.paymentHistory?.find((r) => isSameMonth(new Date(r.date), month));
  const amount = record?.amount ?? expense.amount;

  if (!record?.isPaid) {
    const today = new Date();
    const updated = await addSavingsMovement(goal, {
      type: 'deposit',
      amount,
      date: isSameMonth(month, today) ? today : startOfMonth(month),
      note: 'Aporte mensual',
      affectsBalance: true,
      expenseId: expense.id,
    });
    return { goal: updated, paid: true, amount };
  }

  const movements = await repo.savingsMovements.findByGoal(goal.id!);
  const linked = movements.find(
    (m) => m.type === 'deposit' && m.expenseId === expense.id && isSameMonth(new Date(m.date), month)
  );
  if (linked) {
    const updated = await deleteSavingsMovement(goal, linked);
    return { goal: updated, paid: false, amount };
  }
  // Pagado sin aportación enlazada (p. ej. marcado antes de enlazarlo): solo se desmarca
  await setExpenseMonthPaid(expense.id, month, false);
  return { goal, paid: false, amount };
}
