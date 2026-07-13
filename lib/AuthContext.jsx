"use client";

import { rtdb } from "./firebase";
import { ref, remove } from "firebase/database";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user object
  const [sproutUser, setSproutUser] = useState(null); // { role, name, roomCode, teacherId }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Restore sproutUser from localStorage on reload
      if (firebaseUser) {
        const saved = localStorage.getItem("sproutUser");
        if (saved) setSproutUser(JSON.parse(saved));
      } else {
        setSproutUser(null);
        localStorage.removeItem("sproutUser");
      }
    });
    return unsub;
  }, []);

  // TEACHER: sign in with email + password
  const teacherSignIn = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const data = { role: "teacher", teacherId: cred.user.uid, email };
    setSproutUser(data);
    localStorage.setItem("sproutUser", JSON.stringify(data));
    return cred;
  };

  // TEACHER: create account
  const teacherSignUp = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Save teacher profile to Firestore
    await setDoc(doc(db, "teachers", cred.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp(),
    });
    const data = { role: "teacher", teacherId: cred.user.uid, email, displayName };
    setSproutUser(data);
    localStorage.setItem("sproutUser", JSON.stringify(data));
    return cred;
  };

  // STUDENT: anonymous auth + name/room saved to Firestore
  const studentJoin = async (name, roomCode) => {
    const cred = await signInAnonymously(auth);
    await updateProfile(cred.user, { displayName: name });
    // Record student presence in room
    await setDoc(doc(db, "rooms", roomCode, "members", cred.user.uid), {
      name,
      role: "student",
      joinedAt: serverTimestamp(),
    });
    const data = { role: "student", name, roomCode, uid: cred.user.uid };
    setSproutUser(data);
    localStorage.setItem("sproutUser", JSON.stringify(data));
    return cred;
  };

  const logout = async () => {
    try {
      if (sproutUser?.roomCode && user?.uid) {
        console.log("👋 Removing presence before logout");
  
        await remove(
          ref(rtdb, `presence/${sproutUser.roomCode}/${user.uid}`)
        );
      }
  
      await signOut(auth);
  
      setSproutUser(null);
      localStorage.removeItem("sproutUser");
  
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, sproutUser, loading, teacherSignIn, teacherSignUp, studentJoin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
