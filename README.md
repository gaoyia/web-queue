# web-queue

一个同时支持浏览器和Node.js环境的队列库，使用TypeScript开发。

## 安装

```bash
npm install web-queue
# 或
yarn add web-queue
```

## 使用方法

### 基本用法

```typescript
import { Queue } from 'web-queue';

// 创建一个队列
const queue = new Queue<number>();

// 添加元素
queue.enqueue(1);
queue.enqueue(2);
queue.enqueue(3);

// 获取队列大小
console.log(queue.size()); // 3

// 查看队首元素但不移除
console.log(queue.peek()); // 1

// 移除并返回队首元素
console.log(queue.dequeue()); // 1

// 检查队列是否为空
console.log(queue.isEmpty()); // false

// 清空队列
queue.clear();
console.log(queue.isEmpty()); // true
```

### 转换为数组

```typescript
const queue = new Queue<string>();
queue.enqueue('a');
queue.enqueue('b');
queue.enqueue('c');

const array = queue.toArray();
console.log(array); // ['a', 'b', 'c']
```

### 使用主题队列（TopicQueue）

TopicQueue 使用 BroadcastChannel API 实现基于主题的消息传递，适用于浏览器环境。

```typescript
import { TopicQueue } from 'web-queue';

// 创建一个基于主题的队列
const topic = new TopicQueue<string>('myChannel');

// 订阅消息
const unsubscribe = topic.subscribe(message => {
  console.log('收到消息:', message);
});

// 发送消息（同时添加到队列并广播）
topic.enqueue('Hello World');

// 取消订阅
unsubscribe();

// 关闭通道
topic.close();
```

#### 在多个标签页/窗口之间通信

```typescript
// 在标签页 A 中
const topicA = new TopicQueue<string>('sharedChannel');
topicA.enqueue('来自标签页 A 的消息');

// 在标签页 B 中
const topicB = new TopicQueue<string>('sharedChannel');
topicB.subscribe(message => {
  console.log('标签页 B 收到:', message); // 将显示 "来自标签页 A 的消息"
});
```

### 高级队列功能（AdvancedQueue）

AdvancedQueue 提供了更多高级功能，如消息幂等性、优先级、延迟投递、重试机制和持久化。

```typescript
import { AdvancedQueue, MessageStatus } from 'web-queue';

// 创建高级队列，配置最大重试次数和持久化
const queue = new AdvancedQueue<{ taskId: string, data: any }>({
  maxRetries: 3,
  retryDelay: 1000,
  persistenceEnabled: true,
  persistenceDriver: 'localstorage',
  persistenceInterval: 5000
});

// 添加消息，支持自定义ID（幂等性）、优先级和延迟
const message = queue.enqueue(
  { taskId: 'task-123', data: { value: 42 } },
  { 
    id: 'unique-message-id', // 自定义ID，确保幂等性
    priority: 10,            // 优先级，数字越大优先级越高
    delay: 5000              // 延迟5秒后才可处理
  }
);

// 获取下一个待处理的消息
const nextMessage = queue.dequeue();
if (nextMessage) {
  try {
    // 处理消息...
    processMessage(nextMessage.data);
    
    // 标记消息处理成功
    queue.complete(nextMessage.id);
  } catch (error) {
    // 标记消息处理失败，会自动重试
    queue.fail(nextMessage.id, error.message);
  }
}

// 获取延迟队列中的消息
const delayedMessages = queue.getDelayedMessages();

// 取消延迟消息
queue.cancelDelayed('message-id');

// 获取死信队列中的消息
const deadLetterMessages = queue.getDeadLetterMessages();

// 重试死信队列中的消息
queue.retryDeadLetter('message-id');

// 清理资源
queue.dispose();
```

### 高级主题队列（AdvancedTopicQueue）

AdvancedTopicQueue 结合了 AdvancedQueue 的高级功能和 TopicQueue 的广播能力。

```typescript
import { AdvancedTopicQueue } from 'web-queue';

// 创建高级主题队列
const topicQueue = new AdvancedTopicQueue<{ event: string, payload: any }>(
  'notifications',
  { maxRetries: 2, persistenceEnabled: true }
);

// 订阅消息
const unsubscribe = topicQueue.subscribe(message => {
  console.log(`收到消息 ${message.id}:`, message.data);
});

// 发送高优先级消息
topicQueue.enqueue(
  { event: 'user.login', payload: { userId: 123 } },
  { priority: 10 }
);

// 发送延迟消息（不会立即广播）
topicQueue.enqueue(
  { event: 'maintenance.reminder', payload: { time: '2小时后' } },
  { delay: 7200000 } // 2小时后
);

// 取消订阅并关闭
unsubscribe();
topicQueue.close();
```

### 存储驱动

web-queue 支持多种存储驱动来持久化队列数据：

```typescript
import { 
  AdvancedQueue, 
  MemoryStorageDriver, 
  LocalStorageDriver, 
  IndexedDBStorageDriver 
} from 'web-queue';

// 使用内存存储（默认）
const memoryQueue = new AdvancedQueue({
  persistenceEnabled: true,
  persistenceDriver: 'memory'
});

// 使用 localStorage 存储
const localStorageQueue = new AdvancedQueue({
  persistenceEnabled: true,
  persistenceDriver: 'localstorage'
});

// 使用 IndexedDB 存储
const indexedDBQueue = new AdvancedQueue({
  persistenceEnabled: true,
  persistenceDriver: 'indexeddb'
});
```

## 示例

项目包含多个交互式示例，展示了各种功能的使用方法：

- `examples/advanced-queue-demo.html` - 高级队列基本功能演示
- `examples/advanced-topic-queue-demo.html` - 高级主题队列和多标签页通信
- `examples/storage-drivers-demo.html` - 不同存储驱动的使用
- `examples/idempotent-messages-demo.html` - 消息幂等性功能
- `examples/retry-dead-letter-demo.html` - 重试机制和死信队列
- `examples/delayed-queue-demo.html` - 延迟队列和定时消息

要运行这些示例，只需在浏览器中打开对应的HTML文件。

## API

### Queue

- `enqueue(item: T): void` - 将元素添加到队列末尾
- `dequeue(): T | undefined` - 移除并返回队首元素
- `peek(): T | undefined` - 返回队首元素但不移除
- `size(): number` - 返回队列中的元素数量
- `isEmpty(): boolean` - 检查队列是否为空
- `clear(): void` - 清空队列
- `toArray(): T[]` - 将队列转换为数组

### TopicQueue

TopicQueue 继承自 Queue，并添加了以下方法：

- `constructor(topicName?: string)` - 创建一个基于主题的队列
- `subscribe(callback: (item: T) => void): () => void` - 订阅主题消息，返回取消订阅的函数
- `close(): void` - 关闭广播通道

### AdvancedQueue

- `constructor(options?: Partial<QueueOptions>)` - 创建高级队列，可配置重试、持久化等选项
- `enqueue(data: T, options?: { priority?: number; delay?: number; id?: string }): Message<T>` - 添加消息，支持优先级、延迟和自定义ID
- `dequeue(): Message<T> | undefined` - 获取并标记为处理中的下一个消息
- `peek(): Message<T> | undefined` - 查看下一个待处理消息但不移除
- `complete(messageId: string): boolean` - 标记消息处理成功
- `fail(messageId: string, reason?: string): boolean` - 标记消息处理失败
- `findMessageById(id: string): Message<T> | undefined` - 通过ID查找消息
- `cancelDelayed(messageId: string): boolean` - 取消延迟消息
- `retryDeadLetter(messageId: string): boolean` - 重试死信队列中的消息
- `getDelayedMessages(): Message<T>[]` - 获取所有延迟消息
- `getDeadLetterMessages(): Message<T>[]` - 获取所有死信消息
- `getAllMessages(): Message<T>[]` - 获取所有消息
- `size(): number` - 获取待处理消息数量
- `totalSize(): number` - 获取所有消息数量
- `isEmpty(): boolean` - 检查是否没有待处理消息
- `clear(): void` - 清空所有队列
- `toArray(): Message<T>[]` - 将待处理消息转换为数组
- `dispose(): void` - 清理资源

### AdvancedTopicQueue

AdvancedTopicQueue 继承自 AdvancedQueue，并添加了以下方法：

- `constructor(topicName?: string, options?: Partial<QueueOptions>)` - 创建高级主题队列
- `subscribe(callback: (message: Message<T>) => void): () => void` - 订阅消息，返回取消订阅的函数
- `close(): void` - 关闭广播通道并清理资源

### 存储驱动接口

- `MemoryStorageDriver` - 内存存储驱动
- `LocalStorageDriver` - localStorage 存储驱动
- `IndexedDBStorageDriver` - IndexedDB 存储驱动

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm test
```

## 许可证

Apache License Version 2.0