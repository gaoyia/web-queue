import { MemoryStorageDriver } from './drivers/MemoryStorageDriver';
import { LocalStorageDriver } from './drivers/LocalStorageDriver';
import { IndexedDBStorageDriver } from './drivers/IndexedDBStorageDriver';
import { StorageDriver } from '../utils/types';

export function createStorageDriver(type: string, options?: { dbName?: string, storeName?: string, prefix?: string }): StorageDriver {
  switch (type.toLowerCase()) {
    case 'localstorage':
      return new LocalStorageDriver(options?.prefix);
    case 'indexeddb':
      return new IndexedDBStorageDriver(options?.dbName, options?.storeName);
    case 'memory':
    default:
      return new MemoryStorageDriver();
  }
}