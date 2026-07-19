import { openDB, IDBPDatabase } from 'idb';

export interface PaymentRecord {
  date: Date;
  isPaid: boolean;
  amount?: number; // Cantidad específica para este mes (solo para gastos mensuales)
}

export interface Expense {
  id?: number;
  amount: number;
  category: string;
  description: string;
  date: Date;
  frequency: 'one-time' | 'monthly' | 'bi-monthly' | 'quarterly' | 'annual';
  nextPaymentDate?: Date;
  isPaid: boolean;
  paymentHistory?: PaymentRecord[];
  duration?: number; // Duración en meses para gastos recurrentes
  accountId?: number; // Cuenta con la que se paga el gasto (opcional)
}

export interface Account {
  id?: number;
  name: string;
  color: string; // Color hex para la etiqueta
  createdAt: Date;
}

export interface Balance {
  id?: number;
  amount: number;
  monthlyIncome: number;
  date: Date;
  projectedAmount?: number;
  realAmount?: number;
}

export interface SavingsGoal {
  id?: number;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  startDate: Date;
  targetDate?: Date;
  completed: boolean;
}

export interface Investment {
  id?: number;
  name: string;
  type: 'fixed-deposit' | 'savings-account' | 'government-bond' | 'mutual-fund' | 'other';
  initialAmount: number;
  currentAmount: number;
  annualRate: number; // Tasa anual en porcentaje
  startDate: Date;
  termMonths: number; // Plazo en meses
  maturityDate: Date;
  compoundingFrequency: 'daily' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  isActive: boolean;
  notes?: string;
}

export interface CategoryBudget {
  id?: number;
  category: string;
  monthlyBudget: number;
  updatedAt: Date;
}

export interface AIConfig {
  id?: number;
  apiKey: string;
  updatedAt: Date;
}

const DB_NAME = 'expense-tracker';
const DB_VERSION = 80; // v80: added accounts store

export interface GoogleSheetsConfig {
  id?: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  spreadsheetId: string;
  sheetName: string;
  lastSync: Date | null;
}

// Configuración de BD en la nube (guardada localmente en IndexedDB)
export interface CloudDbConfig {
  id?: number;
  provider: 'turso';
  url: string;
  authToken: string;
  updatedAt: Date;
}

// Definición de tipos para la base de datos
export type ExpenseDB = {
  expenses: {
    key: number;
    value: Expense;
    indexes: { 'date': Date; 'category': string; 'frequency': string; 'isPaid': boolean };
  };
  balance: {
    key: number;
    value: Balance;
    indexes: { 'date': Date };
  };
  sheetConfig: {
    key: number;
    value: GoogleSheetsConfig;
    indexes: { 'lastSync': Date; 'tokenExpiry': Date };
  };
  savings: {
    key: number;
    value: SavingsGoal;
    indexes: { 'startDate': Date; 'completed': boolean };
  };
  investments: {
    key: number;
    value: Investment;
    indexes: { 'startDate': Date; 'type': string; 'isActive': boolean; 'maturityDate': Date };
  };
  dbConfig: {
    key: number;
    value: CloudDbConfig;
    indexes: { 'provider': string; 'updatedAt': Date };
  };
  budgets: {
    key: number;
    value: CategoryBudget;
    indexes: { 'category': string; 'updatedAt': Date };
  };
  aiConfig: {
    key: number;
    value: AIConfig;
    indexes: { 'updatedAt': Date };
  };
  accounts: {
    key: number;
    value: Account;
    indexes: { 'name': string; 'createdAt': Date };
  };
};

// Función para crear o actualizar el store de expenses
function setupExpensesStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('expenses')) {
    const expenseStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
    expenseStore.createIndex('date', 'date');
    expenseStore.createIndex('category', 'category');
    expenseStore.createIndex('frequency', 'frequency');
    expenseStore.createIndex('isPaid', 'isPaid');
  }
}

// Función para crear o actualizar el store de balance
function setupBalanceStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('balance')) {
    const balanceStore = db.createObjectStore('balance', { keyPath: 'id', autoIncrement: true });
    balanceStore.createIndex('date', 'date');
  }
}

// Función para crear o actualizar el store de sheetConfig
function setupSheetConfigStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('sheetConfig')) {
    const configStore = db.createObjectStore('sheetConfig', { keyPath: 'id', autoIncrement: true });
    configStore.createIndex('lastSync', 'lastSync');
    configStore.createIndex('tokenExpiry', 'tokenExpiry');
  }
}

// Función para crear o actualizar el store de savings
function setupSavingsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('savings')) {
    const savingsStore = db.createObjectStore('savings', { keyPath: 'id', autoIncrement: true });
    savingsStore.createIndex('startDate', 'startDate');
    savingsStore.createIndex('completed', 'completed');
  }
}

// Función para crear o actualizar el store de investments
function setupInvestmentsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('investments')) {
    const investmentsStore = db.createObjectStore('investments', { keyPath: 'id', autoIncrement: true });
    investmentsStore.createIndex('startDate', 'startDate');
    investmentsStore.createIndex('type', 'type');
    investmentsStore.createIndex('isActive', 'isActive');
    investmentsStore.createIndex('maturityDate', 'maturityDate');
  }
}

// Store para configuración de BD en la nube (persistida localmente)
function setupDbConfigStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('dbConfig')) {
    const configStore = db.createObjectStore('dbConfig', { keyPath: 'id', autoIncrement: true });
    configStore.createIndex('provider', 'provider');
    configStore.createIndex('updatedAt', 'updatedAt');
  }
}

// Store para presupuestos por categoría
function setupBudgetsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('budgets')) {
    const store = db.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
    store.createIndex('category', 'category');
    store.createIndex('updatedAt', 'updatedAt');
  }
}

// Store para configuración de IA
function setupAIConfigStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('aiConfig')) {
    const store = db.createObjectStore('aiConfig', { keyPath: 'id', autoIncrement: true });
    store.createIndex('updatedAt', 'updatedAt');
  }
}

// Store para cuentas (métodos de pago)
function setupAccountsStore(db: IDBPDatabase<ExpenseDB> | IDBDatabase) {
  if (!db.objectStoreNames.contains('accounts')) {
    const store = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
    store.createIndex('name', 'name');
    store.createIndex('createdAt', 'createdAt');
  }
}

// Función para manejar la migración de datos después de la actualización
// async function handlePostUpgradeMigrations(db: IDBPDatabase<ExpenseDB>, oldVersion: number) {
//   try {
//     // Migración de expenses (versión < 3)
//     if (oldVersion < 3) {
//       const tx = db.transaction('expenses', 'readwrite');
//       const store = tx.objectStore('expenses');
//       const expenses = await store.getAll();
//       
//       for (const expense of expenses) {
//         if (!expense.paymentHistory) {
//           expense.paymentHistory = [];
//           if (expense.isPaid && expense.nextPaymentDate) {
//             expense.paymentHistory.push({
//               date: new Date(expense.nextPaymentDate),
//               isPaid: true
//             });
//           }
//           await store.put(expense);
//         }
//       }
//       await tx.done;
//     }
// 
//     // Migración de balance (versión < 2)
//     if (oldVersion < 2) {
//       const tx = db.transaction('balance', 'readwrite');
//       const store = tx.objectStore('balance');
//       const balances = await store.getAll();
//       
//       for (const balance of balances) {
//         balance.monthlyIncome = balance.monthlyIncome || 0;
//         await store.put(balance);
//       }
//       await tx.done;
//     }
//   } catch (error) {
//     console.error('Error during post-upgrade migrations:', error);
//     throw error;
//   }
// }

// Función para eliminar completamente la base de datos
export async function deleteDatabase(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log(`Base de datos ${DB_NAME} eliminada correctamente`);
      resolve(true);
    };
    
    request.onerror = (event) => {
      console.error(`Error al eliminar la base de datos ${DB_NAME}:`, event);
      reject(new Error(`No se pudo eliminar la base de datos: ${(event.target as any).error}`));
    };
    
    request.onblocked = (_event) => {
      console.warn(`La eliminación de la base de datos ${DB_NAME} está bloqueada, cerrando conexiones...`);
      // Intentamos resolver de todos modos, ya que el usuario puede intentar inicializar después
      resolve(false);
    };
  });
}

export async function initDB() {
  try {
    console.log(`Iniciando apertura de base de datos ${DB_NAME} versión ${DB_VERSION}`);
    
    const db = await openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion: number, newVersion: number | null) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Configuración de stores
        setupExpensesStore(db);
        setupBalanceStore(db);
        setupSheetConfigStore(db);
        setupSavingsStore(db);
        setupInvestmentsStore(db);
        setupDbConfigStore(db);
        setupBudgetsStore(db);
        setupAIConfigStore(db);
        setupAccountsStore(db);
      },
    });

    // Verificar que los stores se hayan creado correctamente
    const storeNames = Array.from(db.objectStoreNames);
    console.log(`Stores creados: ${storeNames.join(', ')}`);

    const requiredStores = ['expenses', 'balance', 'sheetConfig', 'savings', 'investments', 'dbConfig', 'budgets', 'aiConfig', 'accounts'];
    if (requiredStores.some((s) => !storeNames.includes(s))) {
      console.warn('Stores faltantes detectados, intentando reiniciar la base de datos...', storeNames);
      // Intento de recuperación: cerrar, eliminar y recrear la BD
      try {
        db.close();
      } catch {}
      await deleteDatabase();
      await new Promise(resolve => setTimeout(resolve, 300));
      const recreated = await openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
        upgrade(db2, oldVersion: number, newVersion: number | null) {
          console.log(`Recreating database from version ${oldVersion} to ${newVersion}`);
          setupExpensesStore(db2);
          setupBalanceStore(db2);
          setupSheetConfigStore(db2);
          setupSavingsStore(db2);
          setupInvestmentsStore(db2);
          setupDbConfigStore(db2);
          setupBudgetsStore(db2);
          setupAIConfigStore(db2);
          setupAccountsStore(db2);
        },
      });
      const recreatedStores = Array.from(recreated.objectStoreNames);
      console.log('Stores después de recreación:', recreatedStores);
      if (requiredStores.some((s) => !recreatedStores.includes(s))) {
        console.error('No se pudieron crear todos los stores necesarios tras la recreación. Stores existentes:', recreatedStores);
        throw new Error('Faltan stores en la base de datos tras recreación');
      }
      return recreated;
    }

    return db;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

export async function getDB(): Promise<IDBPDatabase<ExpenseDB>> {
  return openDB<ExpenseDB>(DB_NAME, DB_VERSION);
}

export async function createGoogleSheetsConfig(): Promise<IDBPDatabase<ExpenseDB>> {
  // Inicializar la base de datos con la configuración correcta
  await initDB();
  return getDB();
}

// Función para reiniciar la base de datos (eliminar y volver a crear)
export async function resetDatabase(): Promise<IDBPDatabase<ExpenseDB>> {
  try {
    console.log('Iniciando reinicio de la base de datos...');
    
    // Primero intentamos eliminar la base de datos existente
    await deleteDatabase();
    
    // Esperamos un momento para asegurarnos de que se complete la eliminación
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Inicializamos la base de datos nuevamente
    console.log('Creando nueva base de datos...');
    const db = await initDB();
    
    console.log('Base de datos reiniciada correctamente');
    return db;
  } catch (error) {
    console.error('Error al reiniciar la base de datos:', error);
    throw error;
  }
}