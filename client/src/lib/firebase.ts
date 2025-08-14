import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "default_key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "default-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "default-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "default-project"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "default_sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "default_app"
};

let app = null;
let auth = null;
let db = null;
let firebaseInitError = null;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  firebaseInitError = e;
}

export { auth, db, firebaseInitError };

export interface UserRole {
  email: string;
  role: 'user' | 'owner';
}

export interface TaxiData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ownerId: string;
  available: boolean;
}

export interface MessageData {
  id: string;
  text: string;
  sender: string;
  receiver: string;
  participants: string[];
  createdAt: any;
}

export const authService = {
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    if (!auth) throw new Error("Firebase not initialized");
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  async signUp(email: string, password: string, role: 'user' | 'owner'): Promise<FirebaseUser> {
    if (!auth || !db) throw new Error("Firebase not initialized");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", result.user.uid), { email, role });
    return result.user;
  },

  async signOut(): Promise<void> {
    if (!auth) throw new Error("Firebase not initialized");
    await signOut(auth);
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    if (!auth) throw new Error("Firebase not initialized");
    return onAuthStateChanged(auth, callback);
  },

  async getUserRole(uid: string): Promise<UserRole | null> {
    if (!db) throw new Error("Firebase not initialized");
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserRole;
    }
    return null;
  }
};

export const taxiService = {
  async getTaxis(): Promise<TaxiData[]> {
    if (!db) throw new Error("Firebase not initialized");
    const snapshot = await getDocs(collection(db, "taxis"));
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(taxi => typeof taxi.lat === "number" && typeof taxi.lng === "number") as TaxiData[];
  },

  async addTaxi(taxi: Omit<TaxiData, 'id'>): Promise<void> {
    if (!db) throw new Error("Firebase not initialized");
    await addDoc(collection(db, "taxis"), taxi);
  }
};

export const messageService = {
  async sendMessage(text: string, sender: string, receiver: string): Promise<void> {
    if (!db) throw new Error("Firebase not initialized");
    await addDoc(collection(db, "messages"), {
      text,
      sender,
      receiver,
      participants: [sender, receiver],
      createdAt: serverTimestamp()
    });
  },

  onMessagesChange(userEmail: string, otherUserEmail: string, callback: (messages: MessageData[]) => void) {
    if (!db) throw new Error("Firebase not initialized");
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", userEmail),
      orderBy("createdAt", "asc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => 
          Array.isArray(msg.participants) && 
          msg.participants.includes(otherUserEmail)
        ) as MessageData[];
      callback(messages);
    });
  }
};
