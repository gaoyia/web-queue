/**
 * Basic queue implementation that works in both browser and Node.js environments
 */
export class Queue<T> {
  protected items: T[] = [];

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