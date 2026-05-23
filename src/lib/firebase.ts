import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Memory configuration type
export interface FirebaseMemory {
  id: string;
  title: string;
  subTitle: string;
  description: string;
  date: string;
  imageUrl: string;
  videoUrl: string;
  category: string;
  location: string;
  orderIndex: number;
}

export interface FirebaseMusicConfig {
  id: string;
  name: string;
  url: string;
}

/**
 * Fetch all shared memories from Firestore
 */
export async function fetchSharedMemories(): Promise<FirebaseMemory[]> {
  const path = "memories";
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const list: FirebaseMemory[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as FirebaseMemory);
    });
    // Sort by orderIndex
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save/Update a single memory in Firestore
 */
export async function saveSharedMemory(memory: FirebaseMemory): Promise<void> {
  const path = `memories/${memory.id}`;
  try {
    const docRef = doc(db, "memories", memory.id);
    await setDoc(docRef, memory);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a memory from Firestore
 */
export async function deleteSharedMemory(id: string): Promise<void> {
  const path = `memories/${id}`;
  try {
    const docRef = doc(db, "memories", id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save entire memories list to Firestore (e.g. on bulk upload or importing)
 */
export async function saveAllSharedMemories(memories: FirebaseMemory[]): Promise<void> {
  const path = "memories-bulk";
  try {
    const batch = writeBatch(db);
    memories.forEach((m) => {
      const docRef = doc(db, "memories", m.id);
      batch.set(docRef, m);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch music settings from Firestore
 */
export async function fetchSharedMusicConfig(): Promise<FirebaseMusicConfig | null> {
  const path = "settings/music";
  try {
    const colRef = collection(db, "settings");
    const snapshot = await getDocs(colRef);
    let musicConfig: FirebaseMusicConfig | null = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === "music") {
        musicConfig = docSnap.data() as FirebaseMusicConfig;
      }
    });
    return musicConfig;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Save music settings to Firestore
 */
export async function saveSharedMusicConfig(config: FirebaseMusicConfig): Promise<void> {
  const path = `settings/music`;
  try {
    const docRef = doc(db, "settings", "music");
    await setDoc(docRef, config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
