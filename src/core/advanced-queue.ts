import { 
  Message, 
  MessageStatus, 
  QueueOptions, 
  DEFAULT_QUEUE_OPTIONS,
  StorageDriver
} from '../utils/types';
import { 
  generateUniqueId, 
  sortByPriorityAndTime,
  deepClone
} from '../utils/helpers';
import { createStorageDriver } from '../storage/index';

/**
 * Enhanced queue implementation with advanced features
 */
export class AdvancedQueue<T> {
  private messages: Message<T>[] = [];
  private delayedMessages: Message<T>[] = [];
  private deadLetterMessages: Message<T>[] = [];
  private options: QueueOptions;
  private storageDriver: StorageDriver;
  private persistenceTimer: ReturnType<typeof setInterval> | null = null;
  private delayedCheckTimer: ReturnType<typeof setInterval> | null = null;
  private processingMessages: Set<string> = new Set();
  private queueId: string;

  /**
   * Create a new AdvancedQueue
   * @param options Queue configuration options
   */
  constructor(options: Partial<QueueOptions> = {}) {
    this.options = { ...DEFAULT_QUEUE_OPTIONS, ...options };
    this.queueId = generateUniqueId();
    this.storageDriver = createStorageDriver(
      this.options.persistenceDriver,
      { 
        dbName: 'web-queue-db', 
        storeName: 'queue-store', 
        prefix: 'web-queue-'
      }
    );
    
    if (this.options.persistenceEnabled) {
      this.initPersistence();
    }
    
    if (this.options.autoCheckDelayed) {
      this.initDelayedCheck();
    }
  }
  
  /**
   * Initialize delayed message check timer
   */
  private initDelayedCheck(): void {
    if (this.delayedCheckTimer) {
      clearInterval(this.delayedCheckTimer);
    }
    
    this.delayedCheckTimer = setInterval(() => {
      this.checkDelayedMessages();
    }, this.options.delayedCheckInterval);
  }

  /**
   * Initialize persistence mechanism
   */
  private initPersistence(): void {
    // Load saved state
    this.loadState();
    
    // Set up periodic saving
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    
    this.persistenceTimer = setInterval(() => {
      this.saveState();
    }, this.options.persistenceInterval);
  }

  /**
   * Save current queue state to storage
   */
  async saveState(): Promise<void> {
    if (!this.options.persistenceEnabled) return;
    
    try {
      const state = {
        messages: this.messages,
        delayedMessages: this.delayedMessages,
        deadLetterMessages: this.deadLetterMessages,
        queueId: this.queueId
      };
      
      await this.storageDriver.save(`queue-${this.queueId}`, state);
    } catch (error) {
      console.error('Failed to save queue state:', error);
    }
  }

  /**
   * Load queue state from storage
   */
  async loadState(): Promise<void> {
    if (!this.options.persistenceEnabled) return;
    
    try {
      const state = await this.storageDriver.load<{
        messages: Message<T>[];
        delayedMessages: Message<T>[];
        deadLetterMessages: Message<T>[];
        queueId: string;
      }>(`queue-${this.queueId}`);
      
      if (state) {
        this.messages = state.messages;
        this.delayedMessages = state.delayedMessages;
        this.deadLetterMessages = state.deadLetterMessages;
        
        // Process any delayed messages that are now ready
        this.checkDelayedMessages();
      }
    } catch (error) {
      console.error('Failed to load queue state:', error);
    }
  }

  /**
   * Check for delayed messages that are ready to be processed
   */
  private checkDelayedMessages(): void {
    const now = Date.now();
    const readyMessages: Message<T>[] = [];
    const stillDelayed: Message<T>[] = [];
    
    // Find messages that are ready to be processed
    for (const message of this.delayedMessages) {
      if (message.delayUntil && message.delayUntil <= now) {
        message.status = MessageStatus.PENDING;
        message.updatedAt = now;
        readyMessages.push(message);
      } else {
        stillDelayed.push(message);
      }
    }
    
    // Update delayed messages list
    this.delayedMessages = stillDelayed;
    
    // Add ready messages to the main queue
    if (readyMessages.length > 0) {
      this.messages.push(...readyMessages);
      this.messages.sort(sortByPriorityAndTime);
    }
  }

  /**
   * Add a message to the queue
   * @param data Message data
   * @param options Message options
   * @returns The created message
   */
  enqueue(
    data: T, 
    options: { 
      priority?: number; 
      delay?: number; 
      id?: string;
    } = {}
  ): Message<T> {
    const now = Date.now();
    const id = options.id || generateUniqueId();
    
    // Check for duplicate ID
    if (options.id) {
      const existingMessage = this.findMessageById(id);
      if (existingMessage) {
        return existingMessage; // Idempotent operation
      }
    }
    
    const message: Message<T> = {
      id,
      data,
      priority: options.priority || 0,
      status: options.delay ? MessageStatus.DELAYED : MessageStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      processingAttempts: 0
    };
    
    if (options.delay && options.delay > 0) {
      message.delayUntil = now + options.delay;
      this.delayedMessages.push(message);
      this.delayedMessages.sort(sortByPriorityAndTime);
    } else {
      this.messages.push(message);
      this.messages.sort(sortByPriorityAndTime);
    }
    
    return message;
  }

  /**
   * Get the next message from the queue without removing it
   * @returns The next message or undefined if queue is empty
   */
  peek(): Message<T> | undefined {
    // Check for delayed messages that are ready
    this.checkDelayedMessages();
    
    // Return the first pending message
    return this.messages.find(m => m.status === MessageStatus.PENDING);
  }

  /**
   * Get and remove the next message from the queue
   * @returns The next message or undefined if queue is empty
   */
  dequeue(): Message<T> | undefined {
    // Check for delayed messages that are ready
    this.checkDelayedMessages();
    
    // Find the first pending message
    const index = this.messages.findIndex(m => m.status === MessageStatus.PENDING);
    if (index === -1) return undefined;
    
    const message = this.messages[index];
    
    // Mark as processing
    message.status = MessageStatus.PROCESSING;
    message.processingStartedAt = Date.now();
    message.updatedAt = Date.now();
    this.processingMessages.add(message.id);
    
    return message;
  }

  /**
   * Mark a message as completed
   * @param messageId ID of the message to complete
   * @returns True if message was found and completed, false otherwise
   */
  complete(messageId: string): boolean {
    const message = this.findMessageById(messageId);
    if (!message) return false;
    
    message.status = MessageStatus.COMPLETED;
    message.updatedAt = Date.now();
    this.processingMessages.delete(messageId);
    
    return true;
  }

  /**
   * Mark a message as failed
   * @param messageId ID of the message to fail
   * @param reason Reason for failure
   * @returns True if message was found and marked as failed, false otherwise
   */
  fail(messageId: string, reason?: string): boolean {
    const message = this.findMessageById(messageId);
    if (!message) return false;
    
    message.status = MessageStatus.FAILED;
    message.updatedAt = Date.now();
    message.failureReason = reason;
    message.processingAttempts += 1;
    this.processingMessages.delete(messageId);
    
    // Check if we should retry or move to dead letter queue
    if (message.processingAttempts < this.options.maxRetries) {
      // Schedule for retry
      message.status = MessageStatus.DELAYED;
      message.delayUntil = Date.now() + this.options.retryDelay;
      
      // Move to delayed queue
      this.messages = this.messages.filter(m => m.id !== messageId);
      this.delayedMessages.push(message);
      this.delayedMessages.sort(sortByPriorityAndTime);
      
      // For testing with fake timers, immediately check if the message is ready
      // This helps with jest.advanceTimersByTime in tests
      if (this.options.autoCheckDelayed) {
        this.checkDelayedMessages();
      }
    } else if (this.options.deadLetterEnabled) {
      // Move to dead letter queue
      this.messages = this.messages.filter(m => m.id !== messageId);
      this.delayedMessages = this.delayedMessages.filter(m => m.id !== messageId);
      message.status = MessageStatus.DEAD_LETTER;
      this.deadLetterMessages.push(message);
    }
    
    return true;
  }

  /**
   * Find a message by ID in any queue
   * @param id Message ID
   * @returns The message or undefined if not found
   */
  findMessageById(id: string): Message<T> | undefined {
    return this.messages.find(m => m.id === id) || 
           this.delayedMessages.find(m => m.id === id) ||
           this.deadLetterMessages.find(m => m.id === id);
  }

  /**
   * Cancel a delayed message
   * @param messageId ID of the delayed message to cancel
   * @returns True if message was found and canceled, false otherwise
   */
  cancelDelayed(messageId: string): boolean {
    const index = this.delayedMessages.findIndex(m => m.id === messageId);
    if (index === -1) return false;
    
    this.delayedMessages.splice(index, 1);
    return true;
  }

  /**
   * Move a message from the dead letter queue back to the main queue
   * @param messageId ID of the dead letter message to retry
   * @returns True if message was found and moved, false otherwise
   */
  retryDeadLetter(messageId: string): boolean {
    const index = this.deadLetterMessages.findIndex(m => m.id === messageId);
    if (index === -1) return false;
    
    const message = this.deadLetterMessages[index];
    
    // Remove from dead letter queue
    this.deadLetterMessages.splice(index, 1);
    
    // Reset processing attempts and status
    message.processingAttempts = 0;
    message.processingStartedAt = undefined; // Clear processing timestamp
    message.status = MessageStatus.PENDING;
    message.updatedAt = Date.now();
    message.failureReason = undefined;
    message.delayUntil = undefined;
    // Add back to main queue
    this.messages.push(message);
    this.messages.sort(sortByPriorityAndTime);
    
    return true;
  }

  /**
   * Get all delayed messages
   * @returns Array of delayed messages
   */
  getDelayedMessages(): Message<T>[] {
    return deepClone(this.delayedMessages);
  }

  /**
   * Get all dead letter messages
   * @returns Array of dead letter messages
   */
  getDeadLetterMessages(): Message<T>[] {
    return deepClone(this.deadLetterMessages);
  }

  /**
   * Get all messages in the queue
   * @returns Array of all messages
   */
  getAllMessages(): Message<T>[] {
    return deepClone([
      ...this.messages,
      ...this.delayedMessages,
      ...this.deadLetterMessages
    ]);
  }

  /**
   * Get the current size of the queue (pending messages only)
   * @returns Number of pending messages
   */
  size(): number {
    return this.messages.filter(m => m.status === MessageStatus.PENDING).length;
  }

  /**
   * Get the total number of messages in all queues
   * @returns Total number of messages
   */
  totalSize(): number {
    return this.messages.length + this.delayedMessages.length + this.deadLetterMessages.length;
  }

  /**
   * Check if the queue is empty (no pending messages)
   * @returns True if no pending messages, false otherwise
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }

  /**
   * Clear all messages from the queue
   */
  clear(): void {
    this.messages = [];
    this.delayedMessages = [];
    this.deadLetterMessages = [];
    this.processingMessages.clear();
  }

  /**
   * Convert the queue to an array (pending messages only)
   * @returns Array of pending messages
   */
  toArray(): Message<T>[] {
    return deepClone(this.messages.filter(m => m.status === MessageStatus.PENDING));
  }

  /**
   * Clean up resources when done with the queue
   */
  dispose(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
    
    if (this.delayedCheckTimer) {
      clearInterval(this.delayedCheckTimer);
      this.delayedCheckTimer = null;
    }
    
    // Clear any pending messages
    this.messages = [];
    this.delayedMessages = [];
    this.deadLetterMessages = [];
    this.processingMessages.clear();
  }
}