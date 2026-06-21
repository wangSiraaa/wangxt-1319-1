'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { UserPlan } from '@/types';

interface PlanDB extends DBSchema {
  plans: {
    key: string;
    value: UserPlan;
    indexes: { 'by-updatedAt': number };
  };
}

const DB_NAME = 'bus-impact-planner';
const STORE = 'plans';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PlanDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PlanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, {
            keyPath: 'id',
            autoIncrement: false,
          });
          store.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

function generateId(): string {
  return 'plan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export async function savePlan(plan: Omit<UserPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number; updatedAt?: number }): Promise<UserPlan> {
  const db = await getDB();
  const now = Date.now();
  const record: UserPlan = {
    ...plan,
    id: plan.id || generateId(),
    createdAt: plan.createdAt || now,
    updatedAt: now,
  };
  await db.put(STORE, record);
  return record;
}

export async function getPlan(id: string): Promise<UserPlan | undefined> {
  const db = await getDB();
  return db.get(STORE, id);
}

export async function listPlans(): Promise<UserPlan[]> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const index = tx.store.index('by-updatedAt');
  const all = await index.getAll();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deletePlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function clearAllPlans(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}
