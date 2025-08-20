import { AdvancedQueue } from './advanced-queue';
import { Message, QueueOptions } from '../utils/types';

/**
 * Advanced topic-based queue implementation using BroadcastChannel for communication
 * Works in browser environments that support BroadcastChannel API
 */
export class AdvancedTopicQueue<T> extends AdvancedQueue<T> {
  private channel: BroadcastChannel | null = null;
  
  /**
   * Create a new AdvancedTopicQueue
   * @param topicName The name of the topic/channel to use
   * @param options Queue configuration options
   */
  constructor(topicName?: string, options: Partial<QueueOptions> = {}) {
    super(options);
    
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
   * Add a message to the queue and broadcast it to the channel
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
    const message = super.enqueue(data, options);
    
    // Broadcast the message to the channel if available and not delayed
    if (this.channel && !options.delay) {
      this.channel.postMessage(message);
    }
    
    return message;
  }
  
  /**
   * Subscribe to messages on this topic
   * @param callback Function to call when a message is received
   * @returns A function to unsubscribe
   */
  subscribe(callback: (message: Message<T>) => void): () => void {
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
    super.dispose();
  }
}