"use client";

import { useState, useEffect } from "react";
import { subscribeToPresence } from "../lib/usePresence";

export default function RoomTile({ room, onClick }) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPresence(room, setOnlineUsers);
    return () => unsub();
  }, [room]);

  const studentCount = onlineUsers.filter(u => u.role === "student").length;
  const teacherCount = onlineUsers.filter(u => u.role === "teacher").length;
  const isActive = onlineUsers.length > 0;

  return (
    <button
      onClick={onClick}
      className="bg-white hover:bg-sky-50 border rounded-3xl p-5 text-left transition-all relative"
    >
      {/* Live indicator dot */}
      {isActive && (
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
      )}

      <div className="text-xl font-semibold mb-2">{room}</div>

      {isActive ? (
        <div className="space-y-1">
          {studentCount > 0 && (
            <div className="text-sm text-sky-600">👦 {studentCount} student{studentCount !== 1 ? "s" : ""}</div>
          )}
          {teacherCount > 0 && (
            <div className="text-sm text-emerald-600">👩‍🏫 {teacherCount} teacher{teacherCount !== 1 ? "s" : ""}</div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">Empty</div>
      )}
    </button>
  );
}
