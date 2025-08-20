import { StorageDriver } from '../../utils/types';

export class MemoryStorageDriver implements StorageDriver {
  private storage: Record<string, any> = {};

  async save<T>(key: string, data: T): Promise<void> {
    this.storage[key] = data;
  }

  async load<T>(key: string): Promise<T | null> {
    return this.storage[key] || null;
  }

  async delete(key: string): Promise<void> {
    delete this.storage[key];
  }

  async clear(): Promise<void> {
    this.storage = {};
  }
}