import { getDB } from './config';
import type { AIConfig } from './config';

export async function getAIConfig(): Promise<AIConfig | undefined> {
  const db = await getDB();
  const all = await db.getAll('aiConfig');
  return all[0];
}

export async function saveAIConfig(config: Omit<AIConfig, 'id'>): Promise<void> {
  const db = await getDB();
  const existing = await getAIConfig();
  if (existing?.id !== undefined) {
    await db.put('aiConfig', { ...config, id: existing.id });
  } else {
    await db.add('aiConfig', config as AIConfig);
  }
}
