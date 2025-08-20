import { TopicQueue } from '../src/index';

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

describe('TopicQueue', () => {
  let queue: TopicQueue<number>;

  beforeEach(() => {
    queue = new TopicQueue<number>('testTopic');
  });

  afterEach(() => {
    queue.close();
  });

  test('should inherit basic Queue functionality', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    
    expect(queue.size()).toBe(2);
    expect(queue.dequeue()).toBe(1);
    expect(queue.peek()).toBe(2);
  });

  test('should broadcast messages to subscribers', done => {
    // Create a second queue with the same topic
    const queue2 = new TopicQueue<number>('testTopic');
    
    // Subscribe to messages
    queue2.subscribe(item => {
      expect(item).toBe(42);
      queue2.close();
      done();
    });
    
    // Enqueue an item which should trigger the subscription
    queue.enqueue(42);
  });

  test('should allow unsubscribing', () => {
    let callCount = 0;
    const callback = () => { callCount++; };
    
    // Subscribe and get unsubscribe function
    const unsubscribe = queue.subscribe(callback);
    
    // Create a second queue to test broadcasting
    const queue2 = new TopicQueue<number>('testTopic');
    
    // This should trigger the callback
    queue2.enqueue(1);
    expect(callCount).toBe(1);
    
    // Unsubscribe
    unsubscribe();
    
    // This should not trigger the callback
    queue2.enqueue(2);
    expect(callCount).toBe(1); // Still 1, not incremented
    
    queue2.close();
  });
});