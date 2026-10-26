import { isSameMonth } from 'date-fns';
import { Account, Expense } from './config';
import { getCurrentRepository } from './repositoryAdapter';

// Saldos por cuenta. Cuando al menos una cuenta tiene saldo, el saldo actual global
// (Balance.amount) se mantiene como la suma de las cuentas con saldo.

// Eventos para que la barra lateral, Gastos y Configuración se recarguen
export const BALANCE_CHANGED_EVENT = 'balanceChanged';
export const ACCOUNTS_CHANGED_EVENT = 'accountsChanged';

const round2 = (value: number) => Math.round(value * 100) / 100;

export const hasBalance = (account: Account | undefined): account is Account & { balance: number } =>
  typeof account?.balance === 'number';

export const hasAccountBalances = (accounts: Account[]) => accounts.some(hasBalance);

export const accountsTotal = (accounts: Account[]) =>
  round2(accounts.filter(hasBalance).reduce((sum, a) => sum + a.balance, 0));

function notify(accountsChanged: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BALANCE_CHANGED_EVENT));
  if (accountsChanged) window.dispatchEvent(new CustomEvent(ACCOUNTS_CHANGED_EVENT));
  document.dispatchEvent(new CustomEvent('balanceUpdated'));
}

async function saveTotal(amount: number): Promise<void> {
  const repo = await getCurrentRepository();
  const current = await repo.balance.getCurrent();
  const base = current ?? { amount: 0, monthlyIncome: 0, date: new Date() };
  const updated = { ...base, amount: round2(amount), date: new Date() };
  if (current?.id) await repo.balance.update({ ...updated, id: current.id });
  else await repo.balance.create(updated);
}

// Recalcula el saldo actual global como suma de las cuentas (si se llevan saldos por cuenta)
export async function recalcTotalBalance(): Promise<void> {
  const repo = await getCurrentRepository();
  const accounts = await repo.accounts.findAll();
  if (hasAccountBalances(accounts)) await saveTotal(accountsTotal(accounts));
  notify(true);
}

// Fija el saldo de una cuenta. `undefined` deja de llevar su saldo.
export async function setAccountBalance(accountId: number, balance: number | undefined): Promise<void> {
  const repo = await getCurrentRepository();
  const account = await repo.accounts.findById(accountId);
  if (!account) return;
  await repo.accounts.update({ ...account, balance: balance === undefined ? undefined : round2(balance) });
  await recalcTotalBalance();
}

// Suma `delta` al saldo de una cuenta. Solo si la cuenta lleva saldo; devuelve si se aplicó.
export async function adjustAccountBalance(accountId: number, delta: number): Promise<boolean> {
  const repo = await getCurrentRepository();
  const account = await repo.accounts.findById(accountId);
  if (!hasBalance(account)) return false;
  await repo.accounts.update({ ...account, balance: round2(account.balance + delta) });
  await recalcTotalBalance();
  return true;
}

// Movimiento de dinero que afecta al saldo (aportaciones y retiradas de ahorros).
// Con saldos por cuenta va a la cuenta indicada; sin ellos, al saldo actual global.
// Devuelve si se aplicó (con saldos por cuenta y sin cuenta válida no hay de dónde descontar).
export async function applyToBalance(delta: number, accountId?: number): Promise<boolean> {
  if (accountId != null && (await adjustAccountBalance(accountId, delta))) return true;
  const repo = await getCurrentRepository();
  if (hasAccountBalances(await repo.accounts.findAll())) return false;
  const current = await repo.balance.getCurrent();
  await saveTotal((current?.amount ?? 0) + delta);
  notify(false);
  return true;
}

// Al marcar o desmarcar un gasto como pagado en `month`: guarda el gasto anotando en el registro del
// mes de qué cuenta se descontó y descuenta de su saldo (o devuelve lo descontado). Devuelve el gasto guardado.
export async function applyExpensePayment(expense: Expense, month: Date, isPaid: boolean): Promise<Expense> {
  const repo = await getCurrentRepository();
  const history = [...(expense.paymentHistory || [])];
  const index = history.findIndex((r) => isSameMonth(new Date(r.date), month));
  let adjust: { accountId: number; delta: number } | null = null;

  if (index >= 0) {
    const record = { ...history[index] };
    if (isPaid && record.deductedFrom == null && expense.accountId != null) {
      const account = await repo.accounts.findById(expense.accountId);
      if (hasBalance(account)) {
        const amount = round2(record.amount ?? expense.amount);
        record.deductedFrom = expense.accountId;
        record.deductedAmount = amount;
        adjust = { accountId: expense.accountId, delta: -amount };
      }
    } else if (!isPaid && record.deductedFrom != null) {
      adjust = { accountId: record.deductedFrom, delta: record.deductedAmount ?? 0 };
      delete record.deductedFrom;
      delete record.deductedAmount;
    }
    history[index] = record;
  }

  // Primero el gasto y después el saldo: el aviso de saldo cambiado hace que Gastos recargue,
  // y tiene que encontrar el pago ya guardado
  const updated = { ...expense, paymentHistory: history };
  await repo.expenses.update(updated);
  if (adjust) await adjustAccountBalance(adjust.accountId, adjust.delta);
  return updated;
}
