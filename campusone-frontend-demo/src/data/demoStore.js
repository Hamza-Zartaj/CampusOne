import { createInitialDemoData } from './mockData.js';

const STORAGE_KEY = 'campusone-frontend-demo-store-v1';

export const clone = (value) => JSON.parse(JSON.stringify(value));

const canUseStorage = () => (
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
);

export const loadDemoStore = () => {
  if (!canUseStorage()) return createInitialDemoData();

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const initial = createInitialDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(existing);
  } catch {
    const initial = createInitialDemoData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveDemoStore = (store) => {
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  return store;
};

export const resetDemoStore = () => {
  const initial = createInitialDemoData();
  saveDemoStore(initial);
  return initial;
};

export const readDemoStore = (reader) => reader(loadDemoStore());

export const writeDemoStore = (writer) => {
  const store = loadDemoStore();
  const result = writer(store);
  saveDemoStore(store);
  return result;
};

export const nextDemoId = (prefix) => (
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
);
