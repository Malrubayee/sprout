"use client";
 
import { useEffect } from "react";
import { rtdb } from "./firebase";
import { ref, set, onDisconnect, onValue, remove } from "firebase/database";
 
/**
 * Call this inside a room to register the user as online.
 * Automatically cleans up when they leave or close the tab.
 *
 * @param {string} roomCode  - e.g. "JP-NZ-01"
 * @param {string} uid       - Firebase user uid
 * @param {string} name      - Display name
 * @param {string} role      - "student" | "teacher"
 */
export function usePresence(roomCode, uid, name, role) {
  useEffect(() => {
    if (!roomCode || !uid) return;
 
    const userRef = ref(rtdb, `presence/${roomCode}/${uid}`);
 
    // Write online status
    set(userRef, {
      name,
      role,
      online: true,
      joinedAt: Date.now(),
    });
 
    // Auto-remove when connection drops (tab close, network loss, etc.)
    onDisconnect(userRef).remove();
 
    // Cleanup when component unmounts (intentional leave)
    return () => {
      remove(userRef);
    };
  }, [roomCode, uid]);
}
 
/**
 * Subscribe to who's online in a room.
 * Returns a list of { uid, name, role, joinedAt }
 *
 * @param {string} roomCode
 * @param {function} onChange  - called with array of online users
 * @returns cleanup function
 */
export function subscribeToPresence(roomCode, onChange) {
  const roomRef = ref(rtdb, `presence/${roomCode}`);
  const unsub = onValue(roomRef, (snapshot) => {
    const data = snapshot.val() || {};
    const users = Object.entries(data).map(([uid, info]) => ({ uid, ...info }));
    onChange(users);
  });
  return unsub;
}