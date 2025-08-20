/**
 * Generate a unique ID
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
  // Generate a random component
  const randomPart = Math.random().toString(36).substring(2, 10);
  
  // Use timestamp for uniqueness
  const timestampPart = Date.now().toString(36);
  
  // Combine for better uniqueness
  return `${timestampPart}-${randomPart}`;
}

/**
 * Sort messages by priority and creation time
 * Higher priority messages come first, then older messages
 */
export function sortByPriorityAndTime<T>(a: { priority: number, createdAt: number }, b: { priority: number, createdAt: number }): number {
  // First sort by priority (higher first)
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
  
  // Then sort by creation time (older first)
  return a.createdAt - b.createdAt;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return isBrowser() && typeof window.indexedDB !== 'undefined';
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}