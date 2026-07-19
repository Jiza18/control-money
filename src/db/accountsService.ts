import { getDB } from './config';
import { Account } from './config';

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDB();
  const all = await db.getAll('accounts');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAccountById(id: number): Promise<Account | undefined> {
  const db = await getDB();
  return db.get('accounts', id);
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('accounts', account as Account);
}

export async function updateAccount(account: Account): Promise<void> {
  const db = await getDB();
  await db.put('accounts', account);
}

export async function deleteAccount(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('accounts', id);
}
