import { Account } from './config';
import { getCurrentRepository } from './repositoryAdapter';

// Las cuentas se guardan en la BD activa (IndexedDB o Turso), como el resto de entidades

export async function getAllAccounts(): Promise<Account[]> {
  const repo = await getCurrentRepository();
  return repo.accounts.findAll();
}

export async function getAccountById(id: number): Promise<Account | undefined> {
  const repo = await getCurrentRepository();
  return repo.accounts.findById(id);
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<number> {
  const repo = await getCurrentRepository();
  const created = await repo.accounts.create(account);
  return created.id!;
}

export async function updateAccount(account: Account): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.accounts.update(account);
}

export async function deleteAccount(id: number): Promise<void> {
  const repo = await getCurrentRepository();
  await repo.accounts.delete(id);
}
