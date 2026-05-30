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

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const Button = ({ children, variant = "primary", className = "", ...props }) => {
  const styles = {
    primary: "bg-sky-200 text-sky-900 hover:bg-sky-300",
    secondary: "bg-emerald-200 text-emerald-900 hover:bg-emerald-300",
    danger: "bg-red-200 text-red-900 hover:bg-red-300",
  };

  return (
    <button className={`px-4 py-2 rounded-2xl shadow-sm ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const roomMetadata = {
  "JP-NZ-01": {
    roomName: "Japan ↔ New Zealand",
    languages: ["Japanese", "English"],
    ageGroup: "8-10",
  },
};

const missions = [
  "Teach your partner 3 food words 🍙",
  "Ask someone what sport they like ⚽",
  "Draw your school lunch 🍱",
  "Share your favorite animal 🐼",
  "Teach your partner how to say hello 👋",
];

export default function SproutRoom({ roomCode, userData, leaveRoom }) {
  const { user } = useAuth();
  const isTeacher = userData?.role === "teacher";

  // ✅ FIX: device-safe connection id
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

  // ✅ FIX: presence includes uid + connectionId
  usePresence(
    roomCode,
    connectionId,
    userData?.name || userData?.displayName || "User",
    userData?.role || "student",
    user?.uid
  );

  // ✅ FIX: presence read (no collapsing)
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPresence(roomCode, (data) => {
      setOnlineUsers(data || []);
    });
    return () => unsub();
  }, [roomCode]);

  const students = onlineUsers.filter(u => u.role === "student");
  const teachers = onlineUsers.filter(u => u.role === "teacher");

  // ---------------- MODERATION ----------------
  const [mutedUIDs, setMutedUIDs] = useState({});
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "rooms", roomCode, "moderation", "status"),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setMutedUIDs(data.muted || {});
        if (user?.uid && data.removed?.[user.uid]) setRemoved(true);
      }
    );
    return () => unsub();
  }, [roomCode, user?.uid]);

  const isMuted = user?.uid && mutedUIDs[user.uid];

  const muteStudent = async (uid, currentlyMuted) => {
    const modRef = doc(db, "rooms", roomCode, "moderation", "status");
    const snap = await getDoc(modRef);
    const data = snap.exists() ? snap.data() : { muted: {}, removed: {} };

    if (currentlyMuted) delete data.muted[uid];
    else data.muted[uid] = true;

    await setDoc(modRef, data, { merge: true });
  };

  const removeStudent = async (uid) => {
    const modRef = doc(db, "rooms", roomCode, "moderation", "status");
    const snap = await getDoc(modRef);
    const data = snap.exists() ? snap.data() : { muted: {}, removed: {} };

    data.removed = { ...data.removed, [uid]: true };
    await setDoc(modRef, data, { merge: true });

    await remove(ref(rtdb, `presence/${roomCode}`));
  };

  // ---------------- STATE ----------------
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [newTask, setNewTask] = useState("");

  const canvasRef = useRef(null);

  // ---------------- STREAMS ----------------
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

  // ---------------- CHAT ----------------
  const sendMessage = async () => {
    if (!input.trim() || isMuted) return;

    const text = input;
    setInput("");

    await addDoc(collection(db, "rooms", roomCode, "messages"), {
      text,
      userId: user?.uid,
      school: userData?.name || "User",
      createdAt: serverTimestamp(),
    });
  };

  // ---------------- TASKS ----------------
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-3xl border p-10 text-center">
          <h2 className="text-2xl font-semibold">You've been removed</h2>
          <button onClick={leaveRoom} className="mt-4 bg-sky-200 px-4 py-2 rounded-xl">
            Back
          </button>
        </div>
      </div>
    );
  }

  const currentRoom = roomMetadata[roomCode] || roomMetadata["JP-NZ-01"];
  const todayMission = missions[new Date().getDate() % missions.length];

  return (
    <div className="min-h-screen bg-gray-100 p-4">

      <div className="flex justify-between mb-4">
        <button onClick={leaveRoom} className="bg-gray-200 px-4 py-2 rounded-xl">
          Leave
        </button>
        <div>{roomCode}</div>
      </div>

      <Card className="mb-4">
        <CardContent>
          <h2>{currentRoom.roomName}</h2>
          <div>⭐ {todayMission}</div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <div>
            {teachers.map(u => (
              <div key={u.connectionId}>👩‍🏫 {u.name}</div>
            ))}
            {students.map(u => (
              <div key={u.connectionId}>👦 {u.name}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">

        <Card>
          <CardContent>
            <h2>Messages</h2>
            <div className="h-40 overflow-y-auto bg-gray-100 p-2">
              {messages.map(m => (
                <div key={m.id}><b>{m.school}:</b> {m.text}</div>
              ))}
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <VideoCall roomCode={roomCode} currentUser={{ ...userData, uid: user?.uid }} onlineStudents={students} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CulturalExchange roomCode={roomCode} userName={userData?.name || "User"} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}