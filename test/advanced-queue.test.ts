import { AdvancedQueue, Message, MessageStatus } from '../src/index';

describe('AdvancedQueue', () => {
  let queue: AdvancedQueue<{ task: string }>;

  beforeEach(() => {
    queue = new AdvancedQueue<{ task: string }>();
  });

  afterEach(() => {
    queue.dispose();
  });

  test('should enqueue items with unique IDs', () => {
    const msg1 = queue.enqueue({ task: 'task1' });
    const msg2 = queue.enqueue({ task: 'task2' });
    
    expect(msg1.id).toBeDefined();
    expect(msg2.id).toBeDefined();
    expect(msg1.id).not.toBe(msg2.id);
    expect(queue.size()).toBe(2);
  });

  test('should support idempotent operations with custom IDs', () => {
    const customId = 'custom-id-123';
    
    const msg1 = queue.enqueue({ task: 'task1' }, { id: customId });
    const msg2 = queue.enqueue({ task: 'task1' }, { id: customId });
    
    expect(msg1.id).toBe(customId);
    expect(msg2.id).toBe(customId);
    expect(msg1).toBe(msg2); // Should be the same message object
    expect(queue.size()).toBe(1); // Only one message in the queue
  });

  test('should handle priority queuing', () => {
    queue.enqueue({ task: 'low-priority' }, { priority: 1 });
    queue.enqueue({ task: 'high-priority' }, { priority: 10 });
    queue.enqueue({ task: 'medium-priority' }, { priority: 5 });
    
    const first = queue.dequeue();
    const second = queue.dequeue();
    const third = queue.dequeue();
    
    expect(first?.data.task).toBe('high-priority');
    expect(second?.data.task).toBe('medium-priority');
    expect(third?.data.task).toBe('low-priority');
  });

  test('should handle delayed messages', () => {
    jest.useFakeTimers();
    
    try {
      const now = Date.now();
      
      // Add a delayed message (100ms delay)
      queue.enqueue({ task: 'delayed-task' }, { delay: 100 });
      
      // Queue should be empty initially
      expect(queue.size()).toBe(0);
      
      // Advance time by 50ms
      jest.advanceTimersByTime(50);
      
      // Message should still be delayed
      expect(queue.size()).toBe(0);
      
      // Advance time by another 60ms (total 110ms)
      jest.advanceTimersByTime(60);
      
      // Manually check delayed messages since timers don't work in fake timers
      (queue as any).checkDelayedMessages();
      
      // Message should now be available
      expect(queue.size()).toBe(1);
      const message = queue.dequeue();
      expect(message?.data.task).toBe('delayed-task');
    } finally {
      jest.useRealTimers();
    }
  });

  test('should handle message completion', () => {
    const message = queue.enqueue({ task: 'test-task' });
    const dequeuedMessage = queue.dequeue();
    
    expect(dequeuedMessage?.status).toBe(MessageStatus.PROCESSING);
    
    const completed = queue.complete(message.id);
    expect(completed).toBe(true);
    
    const foundMessage = queue.findMessageById(message.id);
    expect(foundMessage?.status).toBe(MessageStatus.COMPLETED);
  });

  test('should handle message failure and retries', () => {
    jest.useFakeTimers();
    
    try {
      // Configure queue with 3 max retries (since we want to test 2 retries)
      // and auto check for delayed messages
      queue = new AdvancedQueue<{ task: string }>({ 
        maxRetries: 3, 
        retryDelay: 100,
        autoCheckDelayed: true,
        delayedCheckInterval: 50
      });
      
      const message = queue.enqueue({ task: 'failing-task' });
      const dequeuedMessage = queue.dequeue();
      
      // Fail the message first time
      queue.fail(message.id, 'First failure');
      
      // Message should be delayed for retry
      expect(queue.size()).toBe(0);
      
      // Advance time to trigger retry
      jest.advanceTimersByTime(110);
      
      // Manually check delayed messages since timers don't work reliably in fake timers
      (queue as any).checkDelayedMessages();
      
      // Message should be available again
      expect(queue.size()).toBe(1);
      const retriedMessage = queue.dequeue();
      expect(retriedMessage?.id).toBe(message.id);
      expect(retriedMessage?.processingAttempts).toBe(1);
      
      // Fail the message second time
      queue.fail(message.id, 'Second failure');
      
      // Advance time to trigger second retry
      jest.advanceTimersByTime(110);
      
      // Manually check delayed messages
      (queue as any).checkDelayedMessages();
      
      // Message should be available again
      expect(queue.size()).toBe(1);
      const retriedMessage2 = queue.dequeue();
      expect(retriedMessage2?.id).toBe(message.id);
      expect(retriedMessage2?.processingAttempts).toBe(2);
      
      // Fail the message third time - should go to dead letter queue
      queue.fail(message.id, 'Third failure');
      
      // Message should not be in main queue
      expect(queue.size()).toBe(0);
      
      // Should be in dead letter queue
      const deadLetterMessages = queue.getDeadLetterMessages();
      expect(deadLetterMessages.length).toBe(1);
      expect(deadLetterMessages[0].id).toBe(message.id);
      expect(deadLetterMessages[0].status).toBe(MessageStatus.DEAD_LETTER);
    } finally {
      jest.useRealTimers();
    }
  });

  test('should allow canceling delayed messages', () => {
    const message = queue.enqueue({ task: 'delayed-task' }, { delay: 1000 });
    
    // Should be in delayed queue
    expect(queue.size()).toBe(0);
    expect(queue.getDelayedMessages().length).toBe(1);
    
    // Cancel the delayed message
    const canceled = queue.cancelDelayed(message.id);
    expect(canceled).toBe(true);
    
    // Should no longer be in delayed queue
    expect(queue.getDelayedMessages().length).toBe(0);
  });

  test('should allow retrying dead letter messages', () => {
    jest.useFakeTimers();
    
    try {
      // Configure queue with 1 max retry and auto check for delayed messages
      queue = new AdvancedQueue<{ task: string }>({ 
        maxRetries: 2,
        autoCheckDelayed: true,
        delayedCheckInterval: 50
      });
      // 添加一条消息 add a message
      let message = queue.enqueue({ task: 'failing-task' });
      // 获取消息状态 Get message status
      expect(message?.status).toBe(MessageStatus.PENDING);

      // 处理次数应该是0 The processing attempts should be 0
      expect(message?.processingAttempts).toBe(0);

      // 第一次发送消息失败 Fail the message first time
      queue.fail(message.id, 'First failure');

      // 处理次数应该是1 The processing attempts should be 1
      expect(message?.processingAttempts).toBe(1);

      // 失败需要重试加入延迟队列 Add the message to the delayed queue
      expect(message?.status).toBe(MessageStatus.DELAYED);
      // 模拟延迟时间 Simulate delay
      jest.advanceTimersByTime(1100);
      // 延迟时间结束后，消息重新加入队列 The message is re-added to the queue after the delay
      expect(message?.status).toBe(MessageStatus.PENDING);
      
      // Get the retried message (peek instead of dequeue to avoid changing state)
      const retriedMessage = queue.findMessageById(message.id);
      
      // Verify message exists and has expected ID
      expect(retriedMessage).toBeDefined();
      expect(retriedMessage?.id).toBe(message.id);
      
      // Verify message status is reset to PENDING
      expect(retriedMessage?.status).toBe(MessageStatus.PENDING);

      // Fail the message second time to move it to dead letter queue
      queue.fail(message.id, 'Second failure');

      // 消息进入死信队列 Should be in dead letter queue
      expect(queue.getDeadLetterMessages().length).toBe(1);
      
      // Retry the dead letter message
      const retried = queue.retryDeadLetter(message.id);
      expect(retried).toBe(true);
      
      // Should be back in main queue
      expect(queue.size()).toBe(1);
      expect(queue.getDeadLetterMessages().length).toBe(0);
      
      // Processing attempts should be reset
      const newMessage = queue.dequeue();
      expect(newMessage?.id).toBe(message.id);
      expect(newMessage?.processingAttempts).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});