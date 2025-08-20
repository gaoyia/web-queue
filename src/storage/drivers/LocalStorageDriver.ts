import { StorageDriver } from '../../utils/types';

export class LocalStorageDriver implements StorageDriver {
  private prefix: string;
  private storageDriver: Storage;

  constructor(prefix: string = 'web-queue-', storageDriver = window.localStorage) {
    this.prefix = prefix;
    if (!storageDriver) {
      throw new Error('LocalStorage is not available in this environment');
    }
    this.storageDriver = storageDriver;
  }

  async save<T>(key: string, data: T): Promise<void> {
    try {
      this.storageDriver.setItem(
        `${this.prefix}${key}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const item = this.storageDriver.getItem(`${this.prefix}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    this.storageDriver.removeItem(`${this.prefix}${key}`);
  }

  async clear(): Promise<void> {
    const keysToRemove = [];
    for (let i = 0; i < this.storageDriver.length; i++) {
      const key = this.storageDriver.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => this.storageDriver.removeItem(key));
  }
}