/**
 * Queue implementation that works in both browser and Node.js environments
 */
export class Queue<T> {
  private items: T[] = [];

  /**
   * Add an item to the queue
   * @param item The item to add
   */
  enqueue(item: T): void {
    this.items.push(item);
  }

  /**
   * Remove and return the first item in the queue
   * @returns The first item in the queue or undefined if queue is empty
   */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /**
   * View the first item without removing it
   * @returns The first item in the queue or undefined if queue is empty
   */
  peek(): T | undefined {
    return this.items[0];
  }

  /**
   * Get the current size of the queue
   * @returns The number of items in the queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if the queue is empty
   * @returns True if the queue is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Convert the queue to an array
   * @returns An array containing all items in the queue
   */
  toArray(): T[] {
    return [...this.items];
  }
}

/**
 * Topic-based queue implementation using BroadcastChannel for communication
 * Works in browser environments that support BroadcastChannel API
 */
export class TopicQueue<T> extends Queue<T> {
  private channel: BroadcastChannel | null = null;
  
  /**
   * Create a new TopicQueue with an optional topic name
   * @param topicName The name of the topic/channel to use
   */
  constructor(topicName?: string) {
    super();
    
    // Only initialize BroadcastChannel if we're in a browser environment that supports it
    if (typeof BroadcastChannel !== 'undefined' && topicName) {
      try {
        this.channel = new BroadcastChannel(topicName);
      } catch (error) {
        console.warn(`Failed to create BroadcastChannel: ${error}`);
      }
    }
  }
  
  /**
   * Add an item to the queue and broadcast it to the channel
   * @param item The item to add
   */
  enqueue(item: T): void {
    super.enqueue(item);
    
    // Broadcast the item to the channel if available
    if (this.channel) {
      this.channel.postMessage(item);
    }
  }
  
  /**
   * Subscribe to messages on this topic
   * @param callback Function to call when a message is received
   * @returns A function to unsubscribe
   */
  subscribe(callback: (item: T) => void): () => void {
    if (!this.channel) {
      console.warn('BroadcastChannel not available, subscription will not work');
      return () => {}; // No-op unsubscribe function
    }
    
    const messageHandler = (event: MessageEvent) => {
      callback(event.data);
    };
    
    this.channel.addEventListener('message', messageHandler);
    
    // Return unsubscribe function
    return () => {
      this.channel?.removeEventListener('message', messageHandler);
    };
  }
  
  /**
   * Close the channel when done
   */
  close(): void {
    this.channel?.close();
    this.channel = null;
  }
}

// Export default and named exports
export default Queue;