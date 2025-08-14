import React, { useEffect, useState, useRef } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  Auth,
  User
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
  Firestore
} from "firebase/firestore";

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

// === CONFIG - replace with your real Firebase config ===
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "default"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "default"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || "YOUR_FIREBASE_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitError: any = null;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  firebaseInitError = e;
  // keep auth/db null so UI can show helpful message
}

interface LoginPanelProps {
  onAuthChanged: () => void;
}

function LoginPanel({ onAuthChanged }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const disabled = !!firebaseInitError || !auth || !db;

  const handleLogin = async () => {
    if (disabled) return alert("Firebase not initialized. Check configuration.");
    if (!email || !password) return alert("Provide email and password");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onAuthChanged) onAuthChanged();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (disabled) return alert("Firebase not initialized. Check configuration.");
    if (!email || !password) return alert("Provide email and password");
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), { email, role });
      if (onAuthChanged) onAuthChanged();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "32px auto", padding: 12 }}>
      <h2>Riderupee — Login / Register</h2>
      {firebaseInitError && (
        <div style={{ color: "#b91c1c", marginBottom: 8 }}>
          Firebase initialization error. Check your config in the source file.
        </div>
      )}
      <input
        style={{ display: "block", padding: 8, width: "100%", marginBottom: 8 }}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={{ display: "block", padding: 8, width: "100%", marginBottom: 8 }}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <select
        style={{ display: "block", padding: 8, width: "100%", marginBottom: 8 }}
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="user">User</option>
        <option value="owner">Taxi Owner</option>
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleLogin} disabled={loading || disabled} style={{ flex: 1, padding: 10 }}>
          Login
        </button>
        <button onClick={handleRegister} disabled={loading || disabled} style={{ flex: 1, padding: 10 }}>
          Register
        </button>
      </div>
    </div>
  );
}

interface MapPanelProps {
  currentUser: User | null;
}

interface TaxiLocation {
  id: string;
  name?: string;
  lat: number;
  lng: number;
}

function MapPanel({ currentUser }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [taxis, setTaxis] = useState<TaxiLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google && window.google.maps) return setMapsLoaded(true);
    if (!API_KEY || API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") return setErrorMsg("Google Maps API key not configured.");
    const id = "gmaps-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    s.async = true;
    s.onload = () => setMapsLoaded(true);
    s.onerror = () => setErrorMsg("Failed to load Google Maps script.");
    document.head.appendChild(s);
  }, [API_KEY]);

  useEffect(() => {
    if (!navigator?.geolocation) {
      setErrorMsg("Geolocation not supported.");
      setLocation(DEFAULT_CENTER);
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setErrorMsg("Unable to access location. Showing default area.");
        setLocation(DEFAULT_CENTER);
      },
      { timeout: 10000 }
    );
    return () => { cancelled = true };
  }, []);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    (async () => {
      try {
        if (!db) return; // firebase not initialized
        const snap = await getDocs(collection(db, "taxis"));
        if (cancelled) return;
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as TaxiLocation))
          .filter(t => typeof t.lat === "number" && typeof t.lng === "number");
        setTaxis(list);
      } catch (e: any) {
        console.error(e);
      }
    })();
    return () => { cancelled = true };
  }, [location]);

  useEffect(() => {
    if (!mapsLoaded || !location || !containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(containerRef.current, { center: location, zoom: 13 });
      new window.google.maps.Marker({ position: location, map: mapRef.current, title: "You" });
    } else {
      mapRef.current.setCenter(location);
    }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    taxis.forEach(t => {
      const marker = new window.google.maps.Marker({
        position: { lat: t.lat, lng: t.lng },
        map: mapRef.current,
        title: t.name || "Taxi"
      });
      markersRef.current.push(marker);
    });
  }, [mapsLoaded, location, taxis]);

  return (
    <div style={{ marginTop: 16 }}>
      {errorMsg && <div style={{ color: "#b91c1c", padding: 8 }}>{errorMsg}</div>}
      <div ref={containerRef} style={{ height: 400, width: "100%" }} />
    </div>
  );
}

interface ChatPanelProps {
  user: User | null;
}

interface Message {
  text: string;
  sender: string;
  participants: string[];
  createdAt: any;
}

function ChatPanel({ user }: ChatPanelProps) {
  const [chatWith, setChatWith] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!user || !chatWith) { setMessages([]); return; }
    if (!db) return;
    const q = query(collection(db, "messages"), where("participants", "array-contains", user.email));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => d.data() as Message).filter(m => Array.isArray(m.participants) && m.participants.includes(chatWith));
      all.sort((a, b) => {
        const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
        const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
        return ta - tb;
      });
      setMessages(all);
    });
    unsubRef.current = unsub;
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [user, chatWith]);

  const sendMessage = async () => {
    const body = (text || "").trim();
    if (!body || !user || !chatWith) return;
    if (!db) return alert("Firebase not initialized. Cannot send message.");
    try {
      await addDoc(collection(db, "messages"), { text: body, sender: user.email, participants: [user.email, chatWith], createdAt: serverTimestamp() });
      setText("");
    } catch (e: any) {
      console.error(e);
      alert("Failed to send message");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <input placeholder="Chat with (owner email)" value={chatWith} onChange={(e) => setChatWith(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
      <div style={{ border: "1px solid #ddd", height: 200, overflowY: "auto", padding: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 6 }}><strong>{m.sender}:</strong> {m.text}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message" style={{ flex: 1, padding: 8 }} />
        <button onClick={sendMessage} style={{ padding: "8px 12px" }}>Send</button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setRole(null); return; }
      setUser(u);
      try {
        if (!db) return setRole(null);
        const snap = await getDoc(doc(db, "users", u.uid));
        const r = snap.exists() ? snap.data().role : null;
        setRole(r === "user" || r === "owner" ? r : null);
      } catch (e: any) {
        console.error(e);
        setRole(null);
      }
    });
    return () => unsub();
  }, [refreshFlag]);

  const handleSignOut = async () => { if (!auth) return; try { await signOut(auth); } catch (e: any) { console.error(e); } };

  if (!auth || !db || firebaseInitError) return <LoginPanel onAuthChanged={() => setRefreshFlag(f => f + 1)} />;

  if (!user || !role) return <LoginPanel onAuthChanged={() => setRefreshFlag(f => f + 1)} />;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Riderupee</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.email} ({role})</span>
          <button onClick={handleSignOut}>Logout</button>
        </div>
      </div>
      <MapPanel currentUser={user} />
      <ChatPanel user={user} />
    </div>
  );
}
