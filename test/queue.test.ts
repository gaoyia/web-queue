import { Queue } from '../src/index';

describe('Queue', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>();
  });

  test('should enqueue items', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    expect(queue.size()).toBe(2);
  });

  test('should dequeue items in FIFO order', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    
    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(3);
    expect(queue.isEmpty()).toBe(true);
  });

  test('should peek at the first item without removing it', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    
    expect(queue.peek()).toBe(1);
    expect(queue.size()).toBe(2);
  });

  test('should clear all items', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.clear();
    
    expect(queue.isEmpty()).toBe(true);
  });

  test('should convert to array', () => {
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    
    expect(queue.toArray()).toEqual([1, 2, 3]);
  });
});