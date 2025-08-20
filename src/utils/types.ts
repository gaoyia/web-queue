/**
 * Message status enum
 */
export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  DEAD_LETTER = 'dead_letter'
}

/**
 * Message interface with metadata
 */
export interface Message<T> {
  id: string;           // Unique message ID
  data: T;              // Message payload
  status: MessageStatus; // Current status
  priority: number;     // Priority (higher number = higher priority)
  createdAt: number;    // Timestamp when message was created
  updatedAt: number;    // Timestamp when message was last updated
  delayUntil?: number;  // Timestamp when message should be processed (for delayed messages)
  processingStartedAt?: number; // Timestamp when processing started
  processingAttempts: number;   // Number of processing attempts
  failureReason?: string;       // Reason for failure if status is FAILED
}

/**
 * Queue configuration options
 */
export interface QueueOptions {
  maxRetries: number;        // Maximum number of retries before moving to dead letter queue
  retryDelay: number;        // Delay in ms before retrying a failed message
  persistenceEnabled: boolean; // Whether to persist queue state
  persistenceDriver: string;  // Storage driver to use ('indexeddb', 'localstorage', 'memory')
  persistenceInterval: number; // Interval in ms to persist queue state
  deadLetterEnabled: boolean;  // Whether to use dead letter queue
  autoCheckDelayed: boolean;   // Whether to automatically check for delayed messages
  delayedCheckInterval: number; // Interval in ms to check for delayed messages
}

/**
 * Default queue options
 */
export const DEFAULT_QUEUE_OPTIONS: QueueOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  persistenceEnabled: false,
  persistenceDriver: 'memory',
  persistenceInterval: 5000,
  deadLetterEnabled: true,
  autoCheckDelayed: false,
  delayedCheckInterval: 100
};

/**
 * Storage driver interface
 */
export interface StorageDriver {
  /**
   * Save data to storage
   */
  save<T>(key: string, data: T): Promise<void>;
  
  /**
   * Load data from storage
   */
  load<T>(key: string): Promise<T | null>;
  
  /**
   * Delete data from storage
   */
  delete(key: string): Promise<void>;
  
  /**
   * Clear all data from storage
   */
  clear(): Promise<void>;
}