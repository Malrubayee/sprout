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
    <button className={`px-4 py-2 rounded-2xl shadow-sm transition-all duration-200 ${styles[variant]} ${className}`} {...props}>
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

  // =========================
  // DEVICE + PRESENCE FIX
  // =========================
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
  const presenceId = user?.uid ? `${user.uid}__${deviceId}` : null;

  usePresence(
    roomCode,
    presenceId,
    userData?.name || userData?.displayName || "Teacher",
    userData?.role || "student"
  );

  // =========================
  // PRESENCE SUBSCRIPTION (FIXED)
  // =========================
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPresence(roomCode, setOnlineUsers);
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

  const muteStudent = async (uid, currentlyMuted) => {
    const modRef = doc(db, "rooms", roomCode, "moderation", "status");
    const snap = await getDoc(modRef);
    const data = snap.exists() ? snap.data() : { muted: {}, removed: {} };

    if (currentlyMuted) {
      delete data.muted[uid];
    } else {
      data.muted[uid] = true;
    }

    await setDoc(modRef, data, { merge: true });
  };

  const removeStudent = async (uid) => {
    const modRef = doc(db, "rooms", roomCode, "moderation", "status");
    const snap = await getDoc(modRef);
    const data = snap.exists() ? snap.data() : { muted: {}, removed: {} };

    data.removed = { ...data.removed, [uid]: true };

    await setDoc(modRef, data, { merge: true });

    // IMPORTANT: wipe all sessions (fixes multi-device properly)
    await remove(ref(rtdb, `presence/${roomCode}`));
  };

  // =========================
  // STATE
  // =========================
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [newTask, setNewTask] = useState("");

  const [color, setColor] = useState("black");
  const [tool, setTool] = useState("brush");
  const [drawing, setDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [startPos, setStartPos] = useState(null);

  const canvasRef = useRef(null);

  // =========================
  // FIRESTORE STREAMS
  // =========================
  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "tasks"), orderBy("createdAt"));
    return onSnapshot(q, (snap) =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "messages"), orderBy("createdAt"));
    return onSnapshot(q, (snap) =>
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [roomCode]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "drawings"), orderBy("createdAt"));
    return onSnapshot(q, (snap) => drawFromData(snap.docs.map(d => d.data())));
  }, [roomCode]);

  // =========================
  // DRAWING
  // =========================
  const drawFromData = (items) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item) => {
      if (!item) return;

      ctx.strokeStyle = item.color || "black";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (item.type === "brush") {
        ctx.beginPath();
        for (let i = 1; i < item.lines.length - 1; i++) {
          const xc = (item.lines[i].x + item.lines[i + 1].x) / 2;
          const yc = (item.lines[i].y + item.lines[i + 1].y) / 2;
          ctx.quadraticCurveTo(item.lines[i].x, item.lines[i].y, xc, yc);
        }
        const last = item.lines[item.lines.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }

      if (item.type === "rect") {
        ctx.strokeRect(
          item.start.x,
          item.start.y,
          item.end.x - item.start.x,
          item.end.y - item.start.y
        );
      }

      if (item.type === "circle") {
        const dx = item.end.x - item.start.x;
        const dy = item.end.y - item.start.y;

        ctx.beginPath();
        ctx.arc(
          item.start.x,
          item.start.y,
          Math.sqrt(dx * dx + dy * dy),
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    });
  };

  // =========================
  // CHAT
  // =========================
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

  // =========================
  // TASKS
  // =========================
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

  // =========================
  // UI GUARD
  // =========================
  if (removed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-3xl border p-10 text-center max-w-sm">
          <div className="text-5xl mb-4">🚪</div>
          <h2 className="text-2xl font-semibold mb-2">You've been removed</h2>
          <p className="text-gray-500 mb-6">The teacher has removed you from this room.</p>
          <button onClick={leaveRoom} className="bg-sky-200 hover:bg-sky-300 px-6 py-3 rounded-2xl font-medium">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentRoom = roomMetadata[roomCode] || roomMetadata["JP-NZ-01"];
  const todayMission = missions[new Date().getDate() % missions.length];

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-gray-100 p-4">

      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={leaveRoom} className="mb-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-2xl">
            ← Leave Room
          </button>
          <h1 className="text-4xl font-medium">🌱 Sprout Room</h1>
        </div>

        <div className="text-right">
          <div className="text-xl text-gray-600">{roomCode}</div>
          <div className="text-sm text-gray-500">{userData?.role}</div>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent>
          <h2 className="text-2xl font-semibold">🌏 {currentRoom.roomName}</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 mt-2">
            ⭐ {todayMission}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {teachers.map(u => (
              <span key={u.connectionId} className="bg-emerald-100 px-3 py-1 rounded-full">
                👩‍🏫 {u.name}
              </span>
            ))}

            {students.map(u => (
              <span key={u.connectionId} className="bg-sky-100 px-3 py-1 rounded-full">
                👦 {u.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">

        {/* CHAT */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">💬 Messages</h2>

            <div className="h-40 overflow-y-auto bg-gray-100 rounded-xl p-2 text-sm">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <strong>{msg.school}:</strong> {msg.text}
                </div>
              ))}
            </div>

            <div className="flex mt-2 gap-2">
              <input
                className="flex-1 border rounded-xl px-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={isMuted}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* VIDEO */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">🎥 Video Call</h2>
            <VideoCall
              roomCode={roomCode}
              currentUser={{ ...userData, uid: user?.uid }}
              onlineStudents={students}
            />
          </CardContent>
        </Card>

        {/* CULTURE */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">📸 Cultural Exchange</h2>
            <CulturalExchange
              roomCode={roomCode}
              userName={userData?.name || "Teacher"}
            />
          </CardContent>
        </Card>

        {/* WHITEBOARD */}
        <Card className="md:col-span-2">
          <CardContent>
            <h2 className="font-semibold mb-2">🖊️ Whiteboard</h2>

            <canvas
              ref={canvasRef}
              width={870}
              height={400}
              className="border bg-white rounded-xl"
            />
          </CardContent>
        </Card>

        {/* TASKS */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">🗓️ Tasks</h2>

            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border rounded-xl px-2"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <Button onClick={addTask} variant="secondary">Add</Button>
            </div>

            <ul className="space-y-2">
              {tasks.map(task => (
                <li key={task.id} className="flex justify-between bg-gray-100 p-2 rounded-xl">
                  <span onClick={() => toggleTask(task)}>
                    {task.text}
                  </span>
                  <button onClick={() => deleteTask(task.id)}>❌</button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* LANGUAGE */}
        <Card className="md:col-span-3">
          <CardContent>
            <h2 className="font-semibold mb-2">🌏 Language Corner</h2>
            <LanguageCorner roomCode={roomCode} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}