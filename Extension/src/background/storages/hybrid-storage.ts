/**
 * @file This file implements a hybrid storage solution that abstracts over different storage mechanisms,
 * providing a unified API for storage operations. It automatically chooses between IndexedDB storage and
 * a fallback storage mechanism based on the environment's capabilities.
 */

import { nanoid } from 'nanoid';
import * as idb from 'idb';

import { ExtendedStorageInterface } from '../../common/storage';

import { BrowserStorage } from './browser-storage';
import { IDBStorage } from './idb-storage';

/**
 * Prefix for the test IndexedDB database name.
 * This test database is used to check if IndexedDB is supported in the current environment.
 */
const TEST_IDB_NAME_PREFIX = 'test_';

/**
 * Implements a hybrid storage mechanism that can switch between IndexedDB and a fallback storage
 * based on browser capabilities and environment constraints. This class adheres to the StorageInterface,
 * allowing for asynchronous get and set operations.
 */
export class HybridStorage implements ExtendedStorageInterface<string, unknown, 'async'> {
    /**
     * Holds the instance of the selected storage mechanism.
     */
    private storage: ExtendedStorageInterface<string, unknown, 'async'> | null = null;

    /**
     * Determines the appropriate storage mechanism to use. If IndexedDB is supported, it uses IDBStorage;
     * otherwise, it falls back to a generic Storage mechanism. This selection is made once and cached
     * for subsequent operations.
     *
     * @returns The storage instance to be used for data operations.
     */
    private async getStorage(): Promise<ExtendedStorageInterface<string, unknown, 'async'>> {
        if (this.storage) {
            return this.storage;
        }

        if (await HybridStorage.isIDBSupported()) {
            this.storage = new IDBStorage();
        } else {
            this.storage = new BrowserStorage();
        }

        return this.storage;
    }

    /**
     * Checks if IndexedDB is supported in the current environment. This is determined by trying to open
     * a test database; if successful, IndexedDB is supported.
     *
     * @returns True if IndexedDB is supported, false otherwise.
     */
    private static async isIDBSupported(): Promise<boolean> {
        try {
            const testDbName = `${TEST_IDB_NAME_PREFIX}${nanoid()}`;
            const testDb = await idb.openDB(testDbName, 1);
            testDb.close();
            await idb.deleteDB(testDbName);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Asynchronously sets a value for a given key in the selected storage mechanism.
     *
     * @param key The key under which the value is stored.
     * @param value The value to be stored.
     * @returns A promise that resolves when the operation is complete.
     */
    async set(key: string, value: unknown): Promise<void> {
        const storage = await this.getStorage();
        return storage.set(key, value);
    }

    /**
     * Asynchronously retrieves the value for a given key from the selected storage mechanism.
     *
     * @param key The key whose value is to be retrieved.
     * @returns A promise that resolves with the retrieved value, or undefined if the key does not exist.
     */
    async get(key: string): Promise<unknown> {
        const storage = await this.getStorage();
        return storage.get(key);
    }

    /**
     * Asynchronously removes the value for a given key from the selected storage mechanism.
     *
     * @param key The key whose value is to be removed.
     */
    async remove(key: string): Promise<void> {
        const storage = await this.getStorage();
        return storage.remove(key);
    }

    /**
     * Atomic set operation for multiple key-value pairs.
     * This method are using transaction to ensure atomicity, if any of the operations fail,
     * the entire operation is rolled back. This helps to prevent data corruption / inconsistency.
     *
     * @param data The key-value pairs to set.
     *
     * @returns True if all operations were successful, false otherwise.
     *
     * @example
     * ```ts
     * const storage = new HybridStorage();
     * await storage.setMultiple({
     *    key1: 'value1',
     *    key2: 'value2',
     * });
     * ```
     */
    public async setMultiple(data: Record<string, unknown>): Promise<boolean> {
        const storage = await this.getStorage();
        return (await storage.setMultiple(data)) ?? false;
    }

    /**
     * Removes multiple key-value pairs from the storage.
     *
     * @param keys The keys to remove.
     */
    public async removeMultiple(keys: string[]): Promise<boolean> {
        const storage = await this.getStorage();
        return (await storage.removeMultiple(keys)) ?? false;
    }

    /**
     * Get the entire contents of the storage.
     *
     * @returns Promise that resolves with the entire contents of the storage.
     */
    public async entries(): Promise<Record<string, unknown>> {
        const storage = await this.getStorage();
        return storage.entries();
    }
}
