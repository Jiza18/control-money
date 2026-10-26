import { 
  DatabaseRepository, 
  ExpenseRepository, 
  BalanceRepository, 
  SavingsRepository, 
  InvestmentRepository, 
  GoogleSheetsRepository,
  AccountRepository,
  SavingsMovementRepository,
  MonthPlanRepository,
  DatabaseOperations 
} from './interfaces';
import { 
  Expense, 
  Balance, 
  SavingsGoal, 
  Investment, 
  GoogleSheetsConfig, 
  Account,
  SavingsMovement,
  MonthPlan,
  getDB 
} from '../config';
import { 
  exportDatabase, 
  importDatabase, 
  clearStore,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpensesByMonth,
  getAllExpenses,
  getUpcomingExpenses,
  updateBalance,
  getCurrentBalance,
  calculateMonthlyBalance
} from '../services';
import {
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getAllSavingsGoals,
  getSavingsGoalById,
  getSavingsGoalsByStatus,
  updateSavingsAmount
} from '../savingsServices';
import {
  addInvestment,
  updateInvestment,
  deleteInvestment,
  getAllInvestments,
  getInvestmentById,
  getActiveInvestments,
  getInvestmentsByType,
  updateInvestmentCurrentValue,
  updateAllInvestmentValues
} from '../investmentServices';

class IndexedDbExpenseRepository implements ExpenseRepository {
  async create(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const id = await addExpense(expense);
    return { ...expense, id } as Expense;
  }

  async update(expense: Expense): Promise<Expense> {
    await updateExpense(expense);
    return expense;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await deleteExpense(id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Expense | undefined> {
    const db = await getDB();
    return await db.get('expenses', id);
  }

  async findAll(): Promise<Expense[]> {
    return await getAllExpenses();
  }

  async findByMonth(date: Date): Promise<Expense[]> {
    return await getExpensesByMonth(date);
  }

  async findByCategory(category: string): Promise<Expense[]> {
    const db = await getDB();
    return await db.getAllFromIndex('expenses', 'category', category);
  }

  async findByFrequency(frequency: Expense['frequency']): Promise<Expense[]> {
    const db = await getDB();
    return await db.getAllFromIndex('expenses', 'frequency', frequency);
  }

  async findByPaidStatus(isPaid: boolean): Promise<Expense[]> {
    // Evitar uso de índice booleano: obtenemos todos y filtramos en memoria
    const all = await getAllExpenses();
    return all.filter(e => e.isPaid === isPaid);
  }

  async getUpcoming(months: number = 3): Promise<Expense[]> {
    return await getUpcomingExpenses(months);
  }
}

class IndexedDbBalanceRepository implements BalanceRepository {
  async create(balance: Omit<Balance, 'id'>): Promise<Balance> {
    await updateBalance(balance);
    const current = await this.getCurrent();
    return current!;
  }

  async update(balance: Balance): Promise<Balance> {
    await updateBalance(balance);
    return balance;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete('balance', id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Balance | undefined> {
    const db = await getDB();
    return await db.get('balance', id);
  }

  async findAll(): Promise<Balance[]> {
    const db = await getDB();
    return await db.getAll('balance');
  }

  async getCurrent(): Promise<Balance | undefined> {
    return await getCurrentBalance();
  }

  async findByMonth(date: Date): Promise<Balance | undefined> {
    const db = await getDB();
    const balances = await db.getAllFromIndex('balance', 'date', date);
    return balances[0];
  }

  async calculateMonthlyBalance(date: Date): Promise<number> {
    // El servicio devuelve un objeto con detalles; la interfaz espera un número
    const result = await calculateMonthlyBalance(date);
    return result?.remainingBalance ?? 0;
  }
}

class IndexedDbSavingsRepository implements SavingsRepository {
  async create(goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> {
    const id = await addSavingsGoal(goal);
    return { ...goal, id } as SavingsGoal;
  }

  async update(goal: SavingsGoal): Promise<SavingsGoal> {
    await updateSavingsGoal(goal);
    return goal;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await deleteSavingsGoal(id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<SavingsGoal | undefined> {
    return await getSavingsGoalById(id);
  }

  async findAll(): Promise<SavingsGoal[]> {
    return await getAllSavingsGoals();
  }

  async findByStatus(completed: boolean): Promise<SavingsGoal[]> {
    return await getSavingsGoalsByStatus(completed);
  }

  async updateAmount(id: number, amount: number): Promise<SavingsGoal> {
    await updateSavingsAmount(id, amount);
    const updated = await this.findById(id);
    return updated!;
  }
}

class IndexedDbInvestmentRepository implements InvestmentRepository {
  async create(investment: Omit<Investment, 'id'>): Promise<Investment> {
    const id = await addInvestment(investment);
    return { ...investment, id } as Investment;
  }

  async update(investment: Investment): Promise<Investment> {
    await updateInvestment(investment);
    return investment;
  }

  async delete(id: number): Promise<boolean> {
    try {
      await deleteInvestment(id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Investment | undefined> {
    return await getInvestmentById(id);
  }

  async findAll(): Promise<Investment[]> {
    return await getAllInvestments();
  }

  async findByType(type: Investment['type']): Promise<Investment[]> {
    return await getInvestmentsByType(type);
  }

  async findActive(): Promise<Investment[]> {
    return await getActiveInvestments();
  }

  async updateCurrentValue(id: number): Promise<Investment> {
    await updateInvestmentCurrentValue(id);
    const updated = await this.findById(id);
    return updated!;
  }

  async updateAllCurrentValues(): Promise<void> {
    await updateAllInvestmentValues();
  }
}

class IndexedDbGoogleSheetsRepository implements GoogleSheetsRepository {
  async create(config: Omit<GoogleSheetsConfig, 'id'>): Promise<GoogleSheetsConfig> {
    const db = await getDB();
    const id = await db.add('sheetConfig', config);
    return { ...config, id } as GoogleSheetsConfig;
  }

  async update(config: GoogleSheetsConfig): Promise<GoogleSheetsConfig> {
    const db = await getDB();
    await db.put('sheetConfig', config);
    return config;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete('sheetConfig', id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<GoogleSheetsConfig | undefined> {
    const db = await getDB();
    return await db.get('sheetConfig', id);
  }

  async findAll(): Promise<GoogleSheetsConfig[]> {
    const db = await getDB();
    return await db.getAll('sheetConfig');
  }

  async findByLastSync(): Promise<GoogleSheetsConfig[]> {
    const db = await getDB();
    return await db.getAllFromIndex('sheetConfig', 'lastSync');
  }

  async updateTokens(id: number, accessToken: string, refreshToken: string, expiry: Date): Promise<GoogleSheetsConfig> {
    const config = await this.findById(id);
    if (!config) throw new Error('Config not found');
    
    const updated = {
      ...config,
      accessToken,
      refreshToken,
      tokenExpiry: expiry
    };
    
    return await this.update(updated);
  }
}

class IndexedDbAccountRepository implements AccountRepository {
  async create(account: Omit<Account, 'id'>): Promise<Account> {
    const db = await getDB();
    const id = await db.add('accounts', account as Account);
    return { ...account, id } as Account;
  }

  async update(account: Account): Promise<Account> {
    const db = await getDB();
    await db.put('accounts', account);
    return account;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete('accounts', id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<Account | undefined> {
    const db = await getDB();
    return await db.get('accounts', id);
  }

  async findAll(): Promise<Account[]> {
    const db = await getDB();
    const all = await db.getAll('accounts');
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Movimientos ordenados del más reciente al más antiguo
const byDateDesc = (a: SavingsMovement, b: SavingsMovement) =>
  new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id ?? 0) - (a.id ?? 0);

class IndexedDbSavingsMovementRepository implements SavingsMovementRepository {
  async create(movement: Omit<SavingsMovement, 'id'>): Promise<SavingsMovement> {
    const db = await getDB();
    const id = await db.add('savingsMovements', movement as SavingsMovement);
    return { ...movement, id } as SavingsMovement;
  }

  async update(movement: SavingsMovement): Promise<SavingsMovement> {
    const db = await getDB();
    await db.put('savingsMovements', movement);
    return movement;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete('savingsMovements', id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<SavingsMovement | undefined> {
    const db = await getDB();
    return await db.get('savingsMovements', id);
  }

  async findAll(): Promise<SavingsMovement[]> {
    const db = await getDB();
    return (await db.getAll('savingsMovements')).sort(byDateDesc);
  }

  async findByGoal(goalId: number): Promise<SavingsMovement[]> {
    const db = await getDB();
    return (await db.getAllFromIndex('savingsMovements', 'goalId', goalId)).sort(byDateDesc);
  }

  async deleteByGoal(goalId: number): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('savingsMovements', 'readwrite');
    const keys = await tx.store.index('goalId').getAllKeys(goalId);
    await Promise.all(keys.map((key) => tx.store.delete(key)));
    await tx.done;
  }
}

class IndexedDbMonthPlanRepository implements MonthPlanRepository {
  async create(plan: Omit<MonthPlan, 'id'>): Promise<MonthPlan> {
    const db = await getDB();
    const id = await db.add('monthPlans', plan as MonthPlan);
    return { ...plan, id } as MonthPlan;
  }

  async update(plan: MonthPlan): Promise<MonthPlan> {
    const db = await getDB();
    await db.put('monthPlans', plan);
    return plan;
  }

  async delete(id: number): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete('monthPlans', id);
      return true;
    } catch {
      return false;
    }
  }

  async findById(id: number): Promise<MonthPlan | undefined> {
    const db = await getDB();
    return await db.get('monthPlans', id);
  }

  async findAll(): Promise<MonthPlan[]> {
    const db = await getDB();
    return (await db.getAll('monthPlans')).sort((a, b) => a.month.localeCompare(b.month));
  }

  async findByMonth(month: string): Promise<MonthPlan | undefined> {
    const db = await getDB();
    return await db.getFromIndex('monthPlans', 'month', month);
  }
}

class IndexedDbDatabaseOperations implements DatabaseOperations {
  async exportData(): Promise<Record<string, any[]>> {
    return await exportDatabase();
  }

  async importData(data: Record<string, any[]>): Promise<void> {
    await importDatabase(data);
  }

  async clearAll(): Promise<void> {
    await clearStore('expenses');
    await clearStore('balance');
    await clearStore('savings');
    await clearStore('investments');
    await clearStore('accounts');
    await clearStore('savingsMovements');
    await clearStore('monthPlans');
    await clearStore('sheetConfig');
  }

  async backup(): Promise<string> {
    const data = await this.exportData();
    return JSON.stringify(data, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    }, 2);
  }

  async restore(backupData: string): Promise<void> {
    const data = JSON.parse(backupData, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
    await this.importData(data);
  }
}

export class IndexedDbRepository implements DatabaseRepository {
  public expenses: ExpenseRepository;
  public balance: BalanceRepository;
  public savings: SavingsRepository;
  public investments: InvestmentRepository;
  public accounts: AccountRepository;
  public savingsMovements: SavingsMovementRepository;
  public monthPlans: MonthPlanRepository;
  public googleSheets: GoogleSheetsRepository;
  public operations: DatabaseOperations;

  constructor() {
    this.expenses = new IndexedDbExpenseRepository();
    this.balance = new IndexedDbBalanceRepository();
    this.savings = new IndexedDbSavingsRepository();
    this.investments = new IndexedDbInvestmentRepository();
    this.accounts = new IndexedDbAccountRepository();
    this.savingsMovements = new IndexedDbSavingsMovementRepository();
    this.monthPlans = new IndexedDbMonthPlanRepository();
    this.googleSheets = new IndexedDbGoogleSheetsRepository();
    this.operations = new IndexedDbDatabaseOperations();
  }

  async exportData(): Promise<Record<string, any[]>> {
    return this.operations.exportData();
  }

  async importData(data: Record<string, any[]>): Promise<void> {
    return this.operations.importData(data);
  }

  async clearAll(): Promise<void> {
    return this.operations.clearAll();
  }

  async backup(): Promise<string> {
    return this.operations.backup();
  }

  async restore(backupData: string): Promise<void> {
    return this.operations.restore(backupData);
  }
}