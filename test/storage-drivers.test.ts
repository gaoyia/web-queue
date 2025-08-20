/**
 * @jest-environment jsdom
 */
import { 
  MemoryStorageDriver, 
  LocalStorageDriver,
  createStorageDriver
} from '../src/index';

describe('Storage Drivers', () => {
  describe('MemoryStorageDriver', () => {
    let driver: MemoryStorageDriver;

    beforeEach(() => {
      driver = new MemoryStorageDriver();
    });

    test('should save and load data', async () => {
      const testData = { test: 'data' };
      await driver.save('test-key', testData);
      
      const loadedData = await driver.load('test-key');
      expect(loadedData).toEqual(testData);
    });

    test('should delete data', async () => {
      const testData = { test: 'data' };
      await driver.save('test-key', testData);
      
      await driver.delete('test-key');
      const loadedData = await driver.load('test-key');
      expect(loadedData).toBeNull();
    });

    test('should clear all data', async () => {
      await driver.save('key1', 'value1');
      await driver.save('key2', 'value2');
      
      await driver.clear();
      
      const data1 = await driver.load('key1');
      const data2 = await driver.load('key2');
      
      expect(data1).toBeNull();
      expect(data2).toBeNull();
    });
  });

  describe('LocalStorageDriver', () => {
    let driver: LocalStorageDriver;

    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        store: Object.create(null),
        setItem: jest.fn(function (key, value) {
          this.store[key] = String(value);
        }),
        getItem: jest.fn(function (key) {
          return this.store[key] ?? null;
        }),
        removeItem: jest.fn(function (key) {
          delete this.store[key];
        }),
        clear: jest.fn(function () {
          this.store = Object.create(null);
        }),
        key: jest.fn(function (index) {
          return Object.keys(this.store)[index] ?? null;
        }),
        get length() {
          return Object.keys(this.store).length;
        },
      };

      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });

      
      driver = new LocalStorageDriver('test-prefix-', global.localStorage);
    });

    test('should save and load data with prefix', async () => {
      const testData = { test: 'data' };
      await driver.save('test-key', testData);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'test-prefix-test-key',
        JSON.stringify(testData)
      );
      
      const loadedData = await driver.load('test-key');
      expect(loadedData).toEqual(testData);
      expect(localStorage.getItem).toHaveBeenCalledWith('test-prefix-test-key');
    });

    test('should delete data with prefix', async () => {
      await driver.save('test-key', 'test-data');
      await driver.delete('test-key');
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('test-prefix-test-key');
    });

    test('should clear only prefixed data', async () => {
      await driver.save('key1', 'value1');
      await driver.save('key2', 'value2');
      localStorage.setItem('other-key', 'other-value');
      await driver.clear();
      
      // Prefixed keys should be removed
      expect(await driver.load('key1')).toBeNull();
      expect(await driver.load('key2')).toBeNull();
      
      // Non-prefixed key should remain
      expect(localStorage.getItem('other-key')).toBe('other-value');
    });
  });

  describe('createStorageDriver', () => {
    test('should create memory driver by default', () => {
      const driver = createStorageDriver('unknown');
      expect(driver).toBeInstanceOf(MemoryStorageDriver);
    });

    test('should create localStorage driver', () => {
      const driver = createStorageDriver('localStorage');
      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });

    test('should create memory driver explicitly', () => {
      const driver = createStorageDriver('memory');
      expect(driver).toBeInstanceOf(MemoryStorageDriver);
    });
  });
});