/**
 * Web Queue - A browser and Node.js compatible queue library
 */

// Export basic queue implementations
export { Queue } from './core/queue';
export { TopicQueue } from './core/topic-queue';

// Export advanced queue implementations
export { AdvancedQueue } from './core/advanced-queue';
export { AdvancedTopicQueue } from './core/advanced-topic-queue';

// Export storage drivers
export { 
  createStorageDriver
} from './storage/index';
// Export types and utilities
export {
  Message,
  MessageStatus,
  QueueOptions,
  DEFAULT_QUEUE_OPTIONS,
  StorageDriver
} from './utils/types';

export {
  generateUniqueId,
  sortByPriorityAndTime,
  deepClone,
  isBrowser,
  isIndexedDBAvailable,
  isLocalStorageAvailable
} from './utils/helpers';

// Default export
import { Queue } from './core/queue';
export { IndexedDBStorageDriver } from './storage/drivers/IndexedDBStorageDriver';
export { LocalStorageDriver } from './storage/drivers/LocalStorageDriver';
export { MemoryStorageDriver } from './storage/drivers/MemoryStorageDriver';
export default Queue;