/**
 * Web Queue 功能测试脚本
 * 
 * 此脚本用于测试 web-queue 库的所有主要功能
 */

import {
  Queue,
  TopicQueue,
  AdvancedQueue,
  AdvancedTopicQueue,
  MessageStatus,
  generateUniqueId,
  MemoryStorageDriver,
  LocalStorageDriver,
  IndexedDBStorageDriver,
  createStorageDriver,
  isBrowser
} from './index';

// 测试基本队列
function testBasicQueue() {
  console.log('=== 测试基本队列 ===');
  
  const queue = new Queue<number>();
  
  // 添加元素
  queue.enqueue(1);
  queue.enqueue(2);
  queue.enqueue(3);
  
  console.log(`队列大小: ${queue.size()}`);
  console.log(`队首元素: ${queue.peek()}`);
  console.log(`出队元素: ${queue.dequeue()}`);
  console.log(`队列是否为空: ${queue.isEmpty()}`);
  
  // 转换为数组
  console.log(`队列内容: ${queue.toArray()}`);
  
  // 清空队列
  queue.clear();
  console.log(`清空后队列是否为空: ${queue.isEmpty()}`);
}

// 测试主题队列
function testTopicQueue() {
  console.log('\n=== 测试主题队列 ===');
  
  if (!isBrowser()) {
    console.log('主题队列需要浏览器环境，跳过测试');
    return;
  }
  
  const topic = new TopicQueue<string>('test-topic');
  
  // 订阅消息
  const unsubscribe = topic.subscribe(message => {
    console.log(`收到消息: ${message}`);
  });
  
  // 发送消息
  topic.enqueue('Hello World');
  
  // 取消订阅
  unsubscribe();
  
  // 关闭通道
  topic.close();
}

// 测试高级队列
async function testAdvancedQueue() {
  console.log('\n=== 测试高级队列 ===');
  
  const queue = new AdvancedQueue<{ task: string }>({
    maxRetries: 2,
    retryDelay: 100
  });
  
  // 测试幂等性
  const id = generateUniqueId();
  const message1 = queue.enqueue({ task: 'task1' }, { id });
  const message2 = queue.enqueue({ task: 'task2' }, { id });
  
  console.log(`消息1 ID: ${message1.id}`);
  console.log(`消息2 ID: ${message2.id}`);
  console.log(`幂等性测试 (应为true): ${message1.id === message2.id}`);
  
  // 测试优先级
  queue.enqueue({ task: 'low-priority' }, { priority: 1 });
  queue.enqueue({ task: 'high-priority' }, { priority: 10 });
  
  const highPriorityMessage = queue.dequeue();
  console.log(`优先级测试 (应为high-priority): ${highPriorityMessage?.data.task}`);
  
  // 测试延迟消息
  const delayedMessage = queue.enqueue({ task: 'delayed-task' }, { delay: 200 });
  console.log(`延迟消息状态: ${delayedMessage.status}`);
  
  const delayedMessages = queue.getDelayedMessages();
  console.log(`延迟队列大小: ${delayedMessages.length}`);
  
  // 等待延迟消息到期
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const readyMessage = queue.dequeue();
  console.log(`延迟消息是否可用: ${readyMessage?.data.task === 'delayed-task'}`);
  
  // 测试重试和死信队列
  if (readyMessage) {
    queue.fail(readyMessage.id, '测试失败');
    console.log(`失败后消息状态: ${queue.findMessageById(readyMessage.id)?.status}`);
    
    // 等待重试
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const retriedMessage = queue.dequeue();
    console.log(`重试消息ID: ${retriedMessage?.id}`);
    
    if (retriedMessage) {
      queue.fail(retriedMessage.id, '再次失败');
      
      // 等待第二次重试
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const retriedAgain = queue.dequeue();
      console.log(`第二次重试消息ID: ${retriedAgain?.id}`);
      
      if (retriedAgain) {
        queue.fail(retriedAgain.id, '第三次失败');
        
        // 应该进入死信队列
        const deadLetterMessages = queue.getDeadLetterMessages();
        console.log(`死信队列大小: ${deadLetterMessages.length}`);
        console.log(`死信消息ID: ${deadLetterMessages[0]?.id}`);
        
        // 重试死信消息
        queue.retryDeadLetter(deadLetterMessages[0].id);
        console.log(`死信队列大小 (重试后): ${queue.getDeadLetterMessages().length}`);
      }
    }
  }
  
  // 清理资源
  queue.dispose();
}

// 测试高级主题队列
function testAdvancedTopicQueue() {
  console.log('\n=== 测试高级主题队列 ===');
  
  if (!isBrowser()) {
    console.log('高级主题队列需要浏览器环境，跳过测试');
    return;
  }
  
  const topicQueue = new AdvancedTopicQueue<{ event: string }>('test-advanced-topic');
  
  // 订阅消息
  const unsubscribe = topicQueue.subscribe(message => {
    console.log(`收到消息: ${message.data.event}, 优先级: ${message.priority}`);
  });
  
  // 发送高优先级消息
  topicQueue.enqueue({ event: 'high-priority-event' }, { priority: 10 });
  
  // 发送延迟消息
  topicQueue.enqueue({ event: 'delayed-event' }, { delay: 1000 });
  
  // 取消订阅并关闭
  unsubscribe();
  topicQueue.close();
}

// 测试存储驱动
async function testStorageDrivers() {
  console.log('\n=== 测试存储驱动 ===');
  
  // 内存存储驱动
  const memoryDriver = new MemoryStorageDriver();
  await memoryDriver.save('test-key', { value: 'test-value' });
  const memoryResult = await memoryDriver.load('test-key') as { value: string } | null;
  console.log(`内存存储测试: ${memoryResult?.value === 'test-value'}`);
  
  // 其他驱动需要浏览器环境
  if (!isBrowser()) {
    console.log('LocalStorage 和 IndexedDB 驱动需要浏览器环境，跳过测试');
    return;
  }
  
  // 创建适合当前环境的驱动
  const driver = createStorageDriver("test-driver");
  console.log(`创建的驱动类型: ${driver.constructor.name}`);
  
  await driver.save('auto-driver-key', { value: 'auto-driver-value' });
  const driverResult = await driver.load('auto-driver-key') as { value: string } | null;
  console.log(`自动驱动测试: ${driverResult?.value === 'auto-driver-value'}`);
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试 Web Queue 库...\n');
  
  testBasicQueue();
  testTopicQueue();
  await testAdvancedQueue();
  testAdvancedTopicQueue();
  await testStorageDrivers();
  
  console.log('\n所有测试完成！');
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试过程中发生错误:', error);
});