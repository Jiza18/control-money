import { getDB } from './config';
import { CategoryBudget } from './config';

export async function getAllBudgets(): Promise<CategoryBudget[]> {
  const db = await getDB();
  return db.getAll('budgets');
}

export async function getBudgetByCategory(category: string): Promise<CategoryBudget | undefined> {
  const db = await getDB();
  const all = await db.getAllFromIndex('budgets', 'category', category);
  return all[0];
}

export async function saveBudget(budget: Omit<CategoryBudget, 'id'>): Promise<void> {
  const db = await getDB();
  const existing = await getBudgetByCategory(budget.category);
  if (existing?.id !== undefined) {
    await db.put('budgets', { ...budget, id: existing.id });
  } else {
    await db.add('budgets', budget);
  }
}

export async function deleteBudget(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('budgets', id);
}
