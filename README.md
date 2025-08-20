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
