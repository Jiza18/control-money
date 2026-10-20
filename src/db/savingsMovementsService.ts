import { SavingsGoal, SavingsMovement } from './config';
import { getCurrentRepository } from './repositoryAdapter';
import { signedAmount } from './savingsInterest';

// Operaciones de movimientos de ahorro. Cada movimiento actualiza el saldo de la meta y, si
// afecta al saldo actual, lo descuenta (aportación) o lo devuelve (retirada).

export type NewSavingsMovement = Omit<SavingsMovement, 'id' | 'goalId'>;

// Evento para que el saldo de la barra lateral y la vista de gastos se recarguen
export const BALANCE_CHANGED_EVENT = 'balanceChanged';

const round2 = (value: number) => Math.round(value * 100) / 100;

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
