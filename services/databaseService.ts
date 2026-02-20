
import { User, Habit, QuranProgress, Recipe } from '../types';

const DB_NAME = 'NurRamadanDB';
const DB_VERSION = 3; // Bumped version for updated recipe store logic

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

  async saveUser(user: User): Promise<void> {
    const store = await this.getStore('users', 'readwrite');
    store.put(user);
  }

  async getUser(email: string): Promise<User | null> {
    const store = await this.getStore('users');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveHabits(email: string, habits: Habit[]): Promise<void> {
    const store = await this.getStore('habits', 'readwrite');
    store.put({ userEmail: email, data: habits });
  }

  async getHabits(email: string): Promise<Habit[] | null> {
    const store = await this.getStore('habits');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  async saveQuran(email: string, quran: QuranProgress): Promise<void> {
    const store = await this.getStore('quran', 'readwrite');
    store.put({ userEmail: email, data: quran });
  }

  async getQuran(email: string): Promise<QuranProgress | null> {
    const store = await this.getStore('quran');
    return new Promise((resolve) => {
      const request = store.get(email);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  async saveRecipe(email: string, recipe: Recipe): Promise<void> {
    const store = await this.getStore('recipes', 'readwrite');
    // We add the user email to the record so we can filter by it
    store.put({ ...recipe, userEmail: email });
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

  async deleteRecipe(id: string): Promise<void> {
    const store = await this.getStore('recipes', 'readwrite');
    store.delete(id);
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    const stores = ['users', 'habits', 'quran', 'recipes'];
    const transaction = this.db!.transaction(stores, 'readwrite');
    stores.forEach(s => transaction.objectStore(s).clear());
  }
}

export const db = new NurDatabase();
