import { User, Habit, QuranProgress, Recipe } from '../types';
import * as api from './apiService';

const DB_NAME = 'NurRamadanDB';
const DB_VERSION = 3;

/** Cache-first: we always read/write IndexedDB for fast UX. When VITE_API_URL is set, we also sync to the backend so data is stored in the DB (e.g. MongoDB). Security: no DB credentials in the frontend; auth is via Google ID token sent to the API. */

export class NurDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('habits')) {
          db.createObjectStore('habits', { keyPath: 'userEmail' });
        }
        if (!db.objectStoreNames.contains('quran')) {
          db.createObjectStore('quran', { keyPath: 'userEmail' });
        }
        if (!db.objectStoreNames.contains('recipes')) {
          // Changed to support multiple recipes by using id as keyPath
          db.createObjectStore('recipes', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction(name, mode);
    return transaction.objectStore(name);
  }

  async saveUser(user: User, opts?: { skipApiSync?: boolean }): Promise<void> {
    const store = await this.getStore('users', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put(user);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!opts?.skipApiSync && api.isApiConfigured()) api.apiSaveUser(user).catch(() => {});
  }

  async getUser(email: string): Promise<User | null> {
    const store = await this.getStore('users');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveHabits(email: string, habits: Habit[], opts?: { skipApiSync?: boolean }): Promise<void> {
    const store = await this.getStore('habits', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ userEmail: email, data: habits });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!opts?.skipApiSync && api.isApiConfigured()) api.apiSaveHabits(habits).catch(() => {});
  }

  async getHabits(email: string): Promise<Habit[] | null> {
    const store = await this.getStore('habits');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  async saveQuran(email: string, quran: QuranProgress, opts?: { skipApiSync?: boolean }): Promise<void> {
    const store = await this.getStore('quran', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ userEmail: email, data: quran });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!opts?.skipApiSync && api.isApiConfigured()) api.apiSaveQuran(quran).catch(() => {});
  }

  async getQuran(email: string): Promise<QuranProgress | null> {
    const store = await this.getStore('quran');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  async saveRecipe(email: string, recipe: Recipe, opts?: { skipApiSync?: boolean }): Promise<void> {
    const store = await this.getStore('recipes', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ ...recipe, userEmail: email });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!opts?.skipApiSync && api.isApiConfigured()) api.apiSaveRecipe(recipe).catch(() => {});
  }

  async getRecipes(email: string): Promise<Recipe[]> {
    const store = await this.getStore('recipes');
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        // Filter recipes belonging to this specific user
        resolve(all.filter((r: any) => r.userEmail === email).sort((a: any, b: any) => b.createdAt - a.createdAt));
      };
    });
  }

  async deleteRecipe(id: string, opts?: { skipApiSync?: boolean }): Promise<void> {
    const store = await this.getStore('recipes', 'readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    if (!opts?.skipApiSync && api.isApiConfigured()) api.apiDeleteRecipe(id).catch(() => {});
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    const stores = ['users', 'habits', 'quran', 'recipes'];
    const transaction = this.db!.transaction(stores, 'readwrite');
    stores.forEach(s => transaction.objectStore(s).clear());
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * After login, fetch user data from the backend (when API is configured) and write it into IndexedDB cache.
   * Location (manualCoords, manualCity) is never stored on the server; we keep the device's local location so it isn't lost on sync.
   */
  async syncFromServer(email: string): Promise<{ user: User | null; habits: Habit[] | null; quran: QuranProgress | null; recipes: Recipe[] } | null> {
    const data = await api.fetchUserDataFromServer();
    if (!data) return null;
    const { user, habits, quran, recipes } = data;
    const noSync = { skipApiSync: true };
    let mergedUser: User | null = user;
    if (user) {
      const local = await this.getUser(email);
      mergedUser = local?.manualCoords !== undefined
        ? { ...user, manualCoords: local.manualCoords, manualCity: local.manualCity }
        : user;
      await this.saveUser(mergedUser, noSync);
    }
    if (habits) await this.saveHabits(email, habits, noSync);
    if (quran) await this.saveQuran(email, quran, noSync);
    if (recipes && recipes.length > 0) {
      for (const r of recipes) await this.saveRecipe(email, r, noSync);
    }
    return { ...data, user: mergedUser };
  }
}

export const db = new NurDatabase();
