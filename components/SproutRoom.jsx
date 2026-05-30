"use client";

import { useState, useEffect, useRef } from "react";
import { db, rtdb } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc,
} from "firebase/firestore";
import { ref, remove } from "firebase/database";
import { useAuth } from "../lib/AuthContext";
import { usePresence, subscribeToPresence } from "../lib/usePresence";
import LanguageCorner from "./LanguageCorner";
import VideoCall from "./VideoCall";
import CulturalExchange from "./CulturalExchange";

// =========================
// UI PRIMITIVES (ENHANCED)
// =========================

const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-gray-200/40 ${className}`}
  >
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

const Button = ({ children, variant = "primary", className = "", ...props }) => {
  const styles = {
    primary:
      "bg-gradient-to-r from-sky-300 to-blue-300 text-sky-900 hover:from-sky-400 hover:to-blue-400",
    secondary:
      "bg-gradient-to-r from-emerald-300 to-green-300 text-emerald-900 hover:from-emerald-400 hover:to-green-400",
    danger:
      "bg-gradient-to-r from-red-200 to-pink-200 text-red-900 hover:from-red-300 hover:to-pink-300",
  };

  return (
    <button
      className={`px-4 py-2 rounded-2xl font-medium shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// =========================
// ROOM DATA
// =========================

const roomMetadata = {
  "JP-NZ-01": { roomName: "Japan ↔ New Zealand", languages: ["Japanese", "English"], ageGroup: "8-10" },
};

const missions = [
  "Teach your partner 3 food words 🍙",
  "Ask someone what sport they like ⚽",
  "Draw your school lunch 🍱",
  "Share your favorite animal 🐼",
  "Teach your partner how to say hello 👋",
];

// =========================
// MAIN COMPONENT
// =========================

export default function SproutRoom({ roomCode, userData, leaveRoom }) {
  const { user } = useAuth();
  const isTeacher = userData?.role === "teacher";

  const getDeviceId = () => {
    if (typeof window === "undefined") return "server";

    let id = localStorage.getItem("sprout_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sprout_device_id", id);
    }
    return id;
  };

  const deviceId = getDeviceId();
  const connectionId = user?.uid ? `${user.uid}__${deviceId}` : null;

  usePresence(
    roomCode,
    connectionId,
    userData?.name || userData?.displayName || "Teacher",
    userData?.role || "student",
    user?.uid
  );

  // =========================
  // PRESENCE
  // =========================
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPresence(roomCode, (data) => {
      setOnlineUsers(data || []);
    });
    return () => unsub();
  }, [roomCode]);

  const students = onlineUsers.filter(u => u.role === "student");
  const teachers = onlineUsers.filter(u => u.role === "teacher");

  // =========================
  // MODERATION
  // =========================
  const [mutedUIDs, setMutedUIDs] = useState({});
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "rooms", roomCode, "moderation", "status"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        setMutedUIDs(data.muted || {});

        if (user?.uid && data.removed?.[user.uid]) {
          setRemoved(true);
        }
      }
    );

    return () => unsub();
  }, [roomCode, user?.uid]);

  const isMuted = user?.uid && mutedUIDs[user.uid];

  // =========================
  // CHAT + TASKS + STATE
  // =========================
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [newTask, setNewTask] = useState("");

  const canvasRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "messages"), orderBy("createdAt"));
    return onSnapshot(q, (snap) =>
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "tasks"), orderBy("createdAt"));
    return onSnapshot(q, (snap) =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  const sendMessage = async () => {
    if (!input.trim() || isMuted) return;

    const text = input;
    setInput("");

    await addDoc(collection(db, "rooms", roomCode, "messages"), {
      text,
      userId: user?.uid,
      school: userData?.name || "Teacher",
      createdAt: serverTimestamp(),
    });
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    await addDoc(collection(db, "rooms", roomCode, "tasks"), {
      text: newTask,
      completed: false,
      createdAt: serverTimestamp(),
    });

    setNewTask("");
  };

  const toggleTask = async (task) => {
    await updateDoc(doc(db, "rooms", roomCode, "tasks", task.id), {
      completed: !task.completed,
    });
  };

  const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, "rooms", roomCode, "tasks", taskId));
  };

  if (removed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-xl">
          <h2 className="text-2xl font-semibold mb-2">You've been removed</h2>
          <p className="text-gray-500 mb-4">Contact your teacher if this was a mistake.</p>
          <button onClick={leaveRoom} className="bg-sky-200 px-5 py-2 rounded-2xl hover:bg-sky-300">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentRoom = roomMetadata[roomCode] || roomMetadata["JP-NZ-01"];
  const todayMission = missions[new Date().getDate() % missions.length];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-sky-50 to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <button
              onClick={leaveRoom}
              className="mb-3 text-sm bg-white/70 backdrop-blur px-4 py-2 rounded-2xl border hover:bg-white transition"
            >
              ← Leave Room
            </button>

            <h1 className="text-4xl font-bold tracking-tight">🌱 Sprout Room</h1>
            <p className="text-gray-500">Collaborative learning space</p>
          </div>

          <div className="text-right">
            <div className="text-lg font-semibold text-gray-700">{roomCode}</div>
            <div className="text-sm text-gray-500">{userData?.role}</div>
          </div>
        </div>

        {/* ROOM INFO */}
        <Card className="mb-5">
          <CardContent>
            <h2 className="text-2xl font-semibold">🌏 {currentRoom.roomName}</h2>
            <div className="mt-3 bg-yellow-100/70 border border-yellow-200 rounded-2xl px-4 py-3 text-sm">
              ⭐ {todayMission}
            </div>
          </CardContent>
        </Card>

        {/* ONLINE USERS */}
        <Card className="mb-5">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">🟢 Online Users</h3>
              <span className="text-xs text-gray-400">
                {onlineUsers.length} connected
              </span>
            </div>

            <div className="space-y-1 text-sm">
              {teachers.map(u => (
                <div key={u.connectionId} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  👩‍🏫 {u.name}
                </div>
              ))}

              {students.map(u => (
                <div key={u.connectionId} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                  👦 {u.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* GRID */}
        <div className="grid md:grid-cols-3 gap-5">

          {/* CHAT */}
          <Card>
            <CardContent>
              <h2 className="font-semibold mb-3">💬 Messages</h2>

              <div className="h-48 overflow-y-auto bg-gray-50 rounded-2xl p-3 space-y-2 text-sm">
                {messages.map(m => (
                  <div key={m.id} className="bg-white p-2 rounded-xl border">
                    <span className="font-semibold">{m.school}:</span> {m.text}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <input
                  className="flex-1 px-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type message..."
                />
                <Button onClick={sendMessage}>Send</Button>
              </div>
            </CardContent>
          </Card>

          {/* VIDEO */}
          <Card>
            <CardContent>
              <h2 className="font-semibold mb-3">🎥 Video Call</h2>
              <VideoCall roomCode={roomCode} currentUser={{ ...userData, uid: user?.uid }} onlineStudents={students} />
            </CardContent>
          </Card>

          {/* CULTURE */}
          <Card>
            <CardContent>
              <h2 className="font-semibold mb-3">📸 Cultural Exchange</h2>
              <CulturalExchange roomCode={roomCode} userName={userData?.name || "Teacher"} />
            </CardContent>
          </Card>

          {/* WHITEBOARD */}
          <Card className="md:col-span-2">
            <CardContent>
              <h2 className="font-semibold mb-3">🖊️ Whiteboard</h2>
              <canvas
                ref={canvasRef}
                width={870}
                height={400}
                className="border rounded-2xl bg-white shadow-inner"
              />
            </CardContent>
          </Card>

          {/* TASKS */}
          <Card>
            <CardContent>
              <h2 className="font-semibold mb-3">🗓️ Tasks</h2>

              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 px-3 py-2 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="New task..."
                />
                <Button variant="secondary" onClick={addTask}>Add</Button>
              </div>

              <div className="space-y-2 text-sm">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border"
                  >
                    <span
                      onClick={() => toggleTask(task)}
                      className={`cursor-pointer ${task.completed ? "line-through text-gray-400" : ""}`}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* LANGUAGE */}
          <Card className="md:col-span-3">
            <CardContent>
              <h2 className="font-semibold mb-3">🌏 Language Corner</h2>
              <LanguageCorner roomCode={roomCode} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}