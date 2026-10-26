import { DatabaseRepository, RepositoryFactory, DatabaseConfig } from './interfaces';
import { IndexedDbRepository } from './indexedDbRepository';
import { TursoRepository } from './tursoRepository';
import { initTursoClient, initializeTursoDatabase, dateToString } from '../tursoConfig';
import { initDB, getDB } from '../config';
import type { Client } from '@libsql/client';
import { getCloudDbConfig, isCloudDbConfigValid } from '../cloudDbConfig';

export class DatabaseRepositoryFactory implements RepositoryFactory {
  async create(config: DatabaseConfig): Promise<DatabaseRepository> {
    switch (config.type) {
      case 'local':
        await initDB();
        return new IndexedDbRepository();
      
      case 'turso':
        if (!config.turso) {
          throw new Error('Turso configuration is required for turso database type');
        }
        
        const client = initTursoClient(config.turso);
        const hadAccountsTable = await tursoTableExists(client, 'accounts');
        await initializeTursoDatabase(client);
        if (!hadAccountsTable) {
          await seedTursoAccountsFromLocal(client);
        }
        return new TursoRepository(client);
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}

async function tursoTableExists(client: Client, table: string): Promise<boolean> {
  const result = await client.execute({
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [table]
  });
  return result.rows.length > 0;
}

// Antes las cuentas solo vivían en IndexedDB. La primera vez que se crea la tabla en Turso se suben
// las locales con su mismo id, para que los gastos que ya apuntan a ellas (account_id) sigan enlazados.
async function seedTursoAccountsFromLocal(client: Client): Promise<void> {
  try {
    const db = await getDB();
    const localAccounts = db.objectStoreNames.contains('accounts') ? await db.getAll('accounts') : [];
    db.close();

    for (const account of localAccounts) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO accounts (id, name, color, created_at, balance) VALUES (?, ?, ?, ?, ?)',
        args: [account.id ?? null, account.name, account.color, dateToString(account.createdAt ?? new Date()), account.balance ?? null]
      });
    }
    if (localAccounts.length > 0) {
      console.log(`Cuentas locales subidas a Turso: ${localAccounts.length}`);
    }
  } catch (error) {
    // No bloquea el arranque con Turso: las cuentas se pueden recrear o sincronizar después
    console.warn('No se pudieron subir las cuentas locales a Turso:', error);
  }
}

// Singleton para el factory
let factoryInstance: DatabaseRepositoryFactory | null = null;

export function getRepositoryFactory(): DatabaseRepositoryFactory {
  if (!factoryInstance) {
    factoryInstance = new DatabaseRepositoryFactory();
  }
  return factoryInstance;
}

// Función de conveniencia para crear un repositorio basado en variables de entorno
export async function createRepositoryFromEnv(): Promise<DatabaseRepository> {
  // Preferencia de usuario en runtime
  let preferred: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      preferred = localStorage.getItem('preferred_db_type');
    } catch {}
  }

  const envType = (import.meta.env.VITE_DB_TYPE || 'local') as 'local' | 'turso';
  const dbType = (preferred === 'turso' || preferred === 'local') ? preferred as 'local' | 'turso' : envType;
  
  const config: DatabaseConfig = {
    type: dbType
  };

  if (dbType === 'turso') {
    // Preferir configuración guardada localmente en IndexedDB
    try {
      const saved = await getCloudDbConfig();
      if (isCloudDbConfigValid(saved)) {
        config.turso = { url: saved!.url, authToken: saved!.authToken };
      } else {
        // Fallback a ENV si no hay configuración guardada
        const url = import.meta.env.VITE_TURSO_DATABASE_URL;
        const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
        if (!url || !authToken) {
          console.warn('Turso configuration missing (no saved config and ENV incomplete), falling back to local database');
          config.type = 'local';
        } else {
          config.turso = { url, authToken };
        }
      }
    } catch (e) {
      console.warn('Error leyendo CloudDbConfig, usando ENV/Fallback local:', e);
      const url = import.meta.env.VITE_TURSO_DATABASE_URL;
      const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;
      if (!url || !authToken) {
        config.type = 'local';
      } else {
        config.turso = { url, authToken };
      }
    }
  }

  const factory = getRepositoryFactory();
  try {
    const repo = await factory.create(config);
    // Persistir el tipo de BD realmente activo
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('active_db_type', config.type); } catch {}
    }
    return repo;
  } catch (err) {
    // Si falló la creación del repositorio Turso (p. ej., network, token inválido), hacer fallback a local
    console.warn('Fallo al inicializar el repositorio seleccionado, haciendo fallback a IndexedDB local:', err);
    try {
      const localConfig: DatabaseConfig = { type: 'local' };
      const localRepo = await factory.create(localConfig);
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('active_db_type', 'local'); } catch {}
      }
      return localRepo;
    } catch (localErr) {
      // Re-lanzar si también falla el local
      console.error('También falló la inicialización del repositorio local:', localErr);
      throw localErr;
    }
  }
}