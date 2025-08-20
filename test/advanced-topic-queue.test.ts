/**
 * @jest-environment jsdom
 */
import { AdvancedTopicQueue, Message, MessageStatus } from '../src/index';

// Mock BroadcastChannel since it's not available in Node.js environment
class MockBroadcastChannel {
  private static channels: Record<string, MockBroadcastChannel[]> = {};
  private listeners: Record<string, Function[]> = {};
  private name: string;

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels[name]) {
      MockBroadcastChannel.channels[name] = [];
    }
    MockBroadcastChannel.channels[name].push(this);
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener);
    }
  }

  postMessage(message: any): void {
    // Broadcast to all other channels with the same name
    MockBroadcastChannel.channels[this.name].forEach(channel => {
      if (channel !== this) {
        channel.dispatchMessage(message);
      }
    });
  }

  dispatchMessage(message: any): void {
    if (this.listeners['message']) {
      this.listeners['message'].forEach(listener => {
        listener({ data: message });
      });
    }
  }

  close(): void {
    MockBroadcastChannel.channels[this.name] = MockBroadcastChannel.channels[this.name].filter(
      channel => channel !== this
    );
  }
}

// Replace global BroadcastChannel with our mock
(global as any).BroadcastChannel = MockBroadcastChannel;

describe('AdvancedTopicQueue', () => {
  let queue: AdvancedTopicQueue<{ task: string }>;

  beforeEach(() => {
    queue = new AdvancedTopicQueue<{ task: string }>('test-topic');
  });

  afterEach(() => {
    queue.close();
  });

  test('should inherit AdvancedQueue functionality', () => {
    const msg = queue.enqueue({ task: 'task1' });
    
    expect(msg.id).toBeDefined();
    expect(queue.size()).toBe(1);
    
    const dequeuedMsg = queue.dequeue();
    expect(dequeuedMsg?.data.task).toBe('task1');
  });

  test('should broadcast messages to subscribers', done => {
    // Create a second queue with the same topic
    const queue2 = new AdvancedTopicQueue<{ task: string }>('test-topic');
    
    // Subscribe to messages
    queue2.subscribe(message => {
      expect(message.data.task).toBe('broadcast-task');
      queue2.close();
      done();
    });
    
    // Enqueue an item which should trigger the subscription
    queue.enqueue({ task: 'broadcast-task' });
  });

  test('should not broadcast delayed messages', done => {
    // Create a second queue with the same topic
    const queue2 = new AdvancedTopicQueue<{ task: string }>('test-topic');
    
    let messageReceived = false;
    
    // Subscribe to messages
    queue2.subscribe(() => {
      messageReceived = true;
    });
    
    // Enqueue a delayed item
    queue.enqueue({ task: 'delayed-task' }, { delay: 100 });
    
    // Check that no message was received
    setTimeout(() => {
      expect(messageReceived).toBe(false);
      queue2.close();
      done();
    }, 50);
  });

  test('should allow unsubscribing', () => {
    let callCount = 0;
    const callback = () => { callCount++; };
    
    // Subscribe and get unsubscribe function
    const unsubscribe = queue.subscribe(callback);
    
    // Create a second queue to test broadcasting
    const queue2 = new AdvancedTopicQueue<{ task: string }>('test-topic');
    
    // This should trigger the callback
    queue2.enqueue({ task: 'task1' });
    expect(callCount).toBe(1);
    
    // Unsubscribe
    unsubscribe();
    
    // This should not trigger the callback
    queue2.enqueue({ task: 'task2' });
    expect(callCount).toBe(1); // Still 1, not incremented
    
    queue2.close();
  });

  test('should handle priority in broadcasting', done => {
    // Create a second queue with the same topic
    const queue2 = new AdvancedTopicQueue<{ task: string }>('test-topic');
    
    // Subscribe to messages
    queue2.subscribe(message => {
      expect(message.priority).toBe(10);
      expect(message.data.task).toBe('high-priority-task');
      queue2.close();
      done();
    });
    
    // Enqueue a high priority item
    queue.enqueue({ task: 'high-priority-task' }, { priority: 10 });
  });
});