import { StorageDriver } from '../../utils/types';
import { isBrowser } from '../../utils/helpers';

export class IndexedDBStorageDriver implements StorageDriver {
  private dbName: string;
  private storeName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string = 'web-queue-db', storeName: string = 'queue-store') {
    this.dbName = dbName;
    this.storeName = storeName;
    if (isBrowser() && typeof window.indexedDB !== 'undefined') {
      this.initDatabase();
    } else {
      console.warn('IndexedDB is not available in this environment');
    }
  }

  private initDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (!isBrowser() || typeof window.indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject(new Error('Failed to open IndexedDB'));
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
    return this.dbPromise;
  }

  async save<T>(key: string, data: T): Promise<void> {
    try {
      const db = await this.initDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      });
    } catch (error) {
      console.error('IndexedDB save error:', error);
      throw error;
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const db = await this.initDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to load from IndexedDB'));
      });
    } catch (error) {
      console.error('IndexedDB load error:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.initDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete from IndexedDB'));
      });
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.initDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear IndexedDB'));
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }
}