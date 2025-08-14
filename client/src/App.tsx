import React, { useEffect, useState, useRef } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
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

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

interface LoginPanelProps {
  onAuthChanged: () => void;
}

function LoginPanel({ onAuthChanged }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const disabled = !!firebaseInitError || !auth || !db;

  // Handle Google redirect result when page loads
  useEffect(() => {
    if (!auth || !db) return;
    
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          const pendingRole = localStorage.getItem('pendingRole') || 'user';
          localStorage.removeItem('pendingRole');
          
          // Check if user already exists in our database
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          // If user doesn't exist, create a new document with stored role
          if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), { 
              email: user.email, 
              role: pendingRole
            });
          }
          
          if (onAuthChanged) onAuthChanged();
        }
      } catch (error) {
        console.error("Redirect result error:", error);
      }
    };

    handleRedirectResult();
  }, [auth, db, onAuthChanged]);

  const handleLogin = async () => {
    if (disabled) {
      alert("Firebase setup required. Please add your Firebase credentials to enable login.");
      return;
    }
    if (!email || !password) return alert("Please provide email and password");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onAuthChanged) onAuthChanged();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (disabled) {
      alert("Firebase setup required. Please add your Firebase credentials to enable registration.");
      return;
    }
    if (!email || !password) return alert("Please provide email and password");
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), { email, role });
      if (onAuthChanged) onAuthChanged();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (disabled) {
      alert("Firebase setup required. Please add your Firebase credentials to enable Google sign-in and all app features.");
      return;
    }
    setLoading(true);
    
    // Store the selected role in localStorage before redirect
    localStorage.setItem('pendingRole', role);
    
    try {
      // Configure Google provider with custom parameters
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Try popup first, fallback to redirect if it fails
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if user already exists in our database
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        // If user doesn't exist, create a new document with selected role
        if (!userDoc.exists()) {
          await setDoc(doc(db, "users", user.uid), { 
            email: user.email, 
            role: role
          });
        }
        
        if (onAuthChanged) onAuthChanged();
      } catch (popupError: any) {
        console.log("Popup failed, trying redirect method...", popupError);
        
        // If popup fails, try redirect method
        if (popupError.code === "auth/popup-blocked" || 
            popupError.code === "auth/unauthorized-domain" ||
            popupError.message?.includes("Unable to open a window") ||
            popupError.message?.includes("Failed to execute 'open'")) {
          try {
            await signInWithRedirect(auth, googleProvider);
            return; // Don't set loading to false here as page will redirect
          } catch (redirectError: any) {
            console.error("Redirect also failed:", redirectError);
            if (redirectError.code === "auth/unauthorized-domain") {
              alert(`Firebase domain authorization required. Please add "${window.location.hostname}" to your Firebase Console → Authentication → Settings → Authorized domains`);
            } else {
              alert("Authentication failed. Please check your Firebase configuration and authorized domains.");
            }
            throw redirectError;
          }
        }
        throw popupError; // Re-throw other errors
      }
    } catch (e: any) {
      console.error("Google sign-in error:", e);
      if (e.code === "auth/popup-closed-by-user") {
        alert("Sign-in was cancelled.");
      } else if (e.code === "auth/unauthorized-domain") {
        alert("This domain is not authorized for Firebase authentication. Please add your Replit URL to Firebase Console → Authentication → Settings → Authorized domains.");
      } else if (e.code === "auth/api-key-not-valid.-please-pass-a-valid-api-key.") {
        alert("Firebase API key is invalid. Please check your Firebase configuration.");
      } else {
        alert(e?.message || "Google sign-in failed. Please check your Firebase setup.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "32px auto", padding: 24, backgroundColor: "white", borderRadius: 8, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
      <h2 style={{ color: "#1f2937", fontSize: "24px", fontWeight: "bold", marginBottom: "24px", textAlign: "center" }}>Riderupee — Login / Register</h2>
      {(firebaseInitError || (!import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "YOUR_FIREBASE_API_KEY")) && (
        <div style={{ color: "#dc2626", backgroundColor: "#fef2f2", padding: 16, borderRadius: 6, marginBottom: 16, border: "1px solid #fecaca" }}>
          <h4 style={{ margin: "0 0 8px 0", fontWeight: "600" }}>Firebase Configuration Required</h4>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px", lineHeight: "1.4" }}>
            To use authentication and real-time features, you need to set up Firebase:
          </p>
          <ol style={{ margin: "0", fontSize: "13px", lineHeight: "1.4", paddingLeft: "20px" }}>
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style={{ color: "#3b82f6" }}>Firebase Console</a></li>
            <li>Create a new project or use existing one</li>
            <li>Enable Authentication with Google and Email/Password</li>
            <li>Enable Firestore Database</li>
            <li><strong>Important:</strong> Add <code style={{ backgroundColor: "#f3f4f6", padding: "2px 4px", borderRadius: "3px", fontSize: "12px" }}>{window.location.origin}</code> to Authentication → Settings → Authorized domains</li>
            <li>Add your Firebase credentials to this Replit project</li>
          </ol>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#6b7280" }}>
            The app will work fully once Firebase is configured.
          </p>
        </div>
      )}
      <input
        style={{ 
          display: "block", 
          padding: 12, 
          width: "100%", 
          marginBottom: 16, 
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "16px",
          color: "#1f2937",
          backgroundColor: "white"
        }}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={{ 
          display: "block", 
          padding: 12, 
          width: "100%", 
          marginBottom: 16, 
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "16px",
          color: "#1f2937",
          backgroundColor: "white"
        }}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <select
        style={{ 
          display: "block", 
          padding: 12, 
          width: "100%", 
          marginBottom: 16, 
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "16px",
          color: "#1f2937",
          backgroundColor: "white"
        }}
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="user">User</option>
        <option value="owner">Taxi Owner</option>
      </select>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button 
          onClick={handleLogin} 
          disabled={loading || disabled} 
          style={{ 
            flex: 1, 
            padding: 12,
            backgroundColor: disabled ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "16px",
            fontWeight: "600",
            cursor: disabled ? "not-allowed" : "pointer"
          }}
        >
          Login
        </button>
        <button 
          onClick={handleRegister} 
          disabled={loading || disabled} 
          style={{ 
            flex: 1, 
            padding: 12,
            backgroundColor: disabled ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "16px",
            fontWeight: "600",
            cursor: disabled ? "not-allowed" : "pointer"
          }}
        >
          Register
        </button>
      </div>
      
      <div style={{ textAlign: "center", margin: "16px 0", color: "#6b7280", fontSize: "14px" }}>
        or
      </div>
      
      <button 
        onClick={handleGoogleSignIn} 
        disabled={loading || disabled} 
        style={{ 
          width: "100%", 
          padding: 12,
          backgroundColor: disabled ? "#9ca3af" : "#ffffff",
          color: disabled ? "#ffffff" : "#1f2937",
          border: disabled ? "none" : "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "16px",
          fontWeight: "600",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.540-1.837.860-3.048.860-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.440 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </g>
        </svg>
        Continue with Google
      </button>
      
      {disabled && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: "#fef3c7", 
          border: "1px solid #f59e0b",
          borderRadius: 6, 
          fontSize: "13px", 
          color: "#92400e" 
        }}>
          <strong>Need Firebase Setup:</strong> For Google sign-in to work, add your current URL <code style={{ backgroundColor: "#ffffff", padding: "2px 4px", borderRadius: "3px" }}>{window.location.hostname}</code> to Firebase Console → Authentication → Settings → Authorized domains
        </div>
      )}
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
    <div>
      {errorMsg && (
        <div style={{ 
          color: "#dc2626", 
          backgroundColor: "#fef2f2", 
          padding: 12, 
          margin: 16,
          borderRadius: 6, 
          border: "1px solid #fecaca" 
        }}>
          {errorMsg}
        </div>
      )}
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
    <div>
      <h3 style={{ color: "#1f2937", fontSize: "18px", fontWeight: "600", marginBottom: 16, margin: "0 0 16px 0" }}>Chat with Taxi Owner</h3>
      <input 
        placeholder="Chat with (owner email)" 
        value={chatWith} 
        onChange={(e) => setChatWith(e.target.value)} 
        style={{ 
          width: "100%", 
          padding: 12, 
          marginBottom: 16,
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: "14px",
          color: "#1f2937",
          backgroundColor: "white"
        }} 
      />
      <div style={{ 
        border: "1px solid #e5e7eb", 
        height: 200, 
        overflowY: "auto", 
        padding: 16,
        backgroundColor: "#f9fafb",
        borderRadius: 6
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#6b7280", 
            fontSize: "14px",
            paddingTop: 60 
          }}>
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ 
              marginBottom: 12,
              padding: 8,
              backgroundColor: m.sender === user?.email ? "#dbeafe" : "white",
              borderRadius: 6,
              border: "1px solid #e5e7eb"
            }}>
              <strong style={{ color: "#374151", fontSize: "12px" }}>{m.sender}:</strong>
              <p style={{ color: "#1f2937", margin: "4px 0 0 0", fontSize: "14px" }}>{m.text}</p>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Type message" 
          style={{ 
            flex: 1, 
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: "14px",
            color: "#1f2937",
            backgroundColor: "white"
          }} 
        />
        <button 
          onClick={sendMessage}
          style={{
            padding: "12px 20px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          Send
        </button>
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
    <div style={{ padding: 16, minHeight: "100vh", backgroundColor: "#f9fafb", color: "#1f2937" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }}>
        <h1 style={{ color: "#1f2937", fontSize: "28px", fontWeight: "bold", margin: 0 }}>Riderupee</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#6b7280", fontSize: "14px" }}>{user.email} ({role})</span>
          <button 
            onClick={handleSignOut}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div style={{ backgroundColor: "white", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
          <MapPanel currentUser={user} />
        </div>
        <div style={{ backgroundColor: "white", borderRadius: 8, padding: 16, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
          <ChatPanel user={user} />
        </div>
      </div>
    </div>
  );
}
