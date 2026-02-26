
const DB_NAME = 'ControlObrasDB';
const STORE_NAME = 'project_data';
const KEY = 'current_project';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveProjectData = async (data: any) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadProjectData = async () => {
  const db = await initDB();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getStorageUsage = async () => {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage || 0,
            quota: estimate.quota || 0
        };
    }
    return { usage: 0, quota: 0 };
};
