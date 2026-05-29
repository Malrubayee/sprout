"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function CulturalExchange({ roomCode, userName }) {
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "uploads"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setUploads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [roomCode]);

  return (
    <div>
      <div className="h-40 overflow-y-auto bg-gray-100 rounded-xl p-2 mb-2">
        {uploads.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-12">No uploads yet</p>
        )}
        <div className="grid grid-cols-3 gap-1">
          {uploads.map(u => (
            <a key={u.id} href={u.url} target="_blank" rel="noreferrer">
              <img src={u.url} alt={u.name} className="w-full h-16 object-cover rounded-lg" />
            </a>
          ))}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" />
      <button
        disabled
        className="w-full bg-gray-100 text-gray-400 py-2 rounded-2xl font-medium text-sm cursor-not-allowed"
      >
        📎 Upload coming soon
      </button>
    </div>
  );
}