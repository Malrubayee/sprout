"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, getDocs, deleteDoc, doc, updateDoc,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { usePresence, subscribeToPresence } from "../lib/usePresence";
import LanguageCorner from "./LanguageCorner";
import VideoCall from "./VideoCall";

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
  "JP-NZ-01": { roomName: "Japan ↔ New Zealand", languages: ["Japanese", "English"], ageGroup: "8-10" },
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

  // Register presence
  usePresence(
    roomCode,
    user?.uid,
    userData?.name || userData?.displayName || "Teacher",
    userData?.role || "student"
  );

  // Subscribe to who's online
  const [onlineUsers, setOnlineUsers] = useState([]);
  useEffect(() => {
    const unsub = subscribeToPresence(roomCode, setOnlineUsers);
    return () => unsub();
  }, [roomCode]);

  const [drawing, setDrawing] = useState(false);
  const [lines, setLines] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [color, setColor] = useState("black");
  const [tool, setTool] = useState("brush");
  const [startPos, setStartPos] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const canvasRef = useRef(null);

  const currentRoom = roomMetadata[roomCode] || roomMetadata["JP-NZ-01"];
  const todayMission = missions[new Date().getDate() % missions.length];

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "tasks"), orderBy("createdAt"));
    return onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [roomCode]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "drawings"), orderBy("createdAt"));
    return onSnapshot(q, (snap) => drawFromData(snap.docs.map(d => d.data())));
  }, [roomCode]);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomCode, "messages"), orderBy("createdAt"));
    return onSnapshot(q, (snap) => setMessages(snap.docs.map(d => d.data())));
  }, [roomCode]);

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
        ctx.strokeRect(item.start.x, item.start.y, item.end.x - item.start.x, item.end.y - item.start.y);
      }
      if (item.type === "circle") {
        const dx = item.end.x - item.start.x;
        const dy = item.end.y - item.start.y;
        ctx.beginPath();
        ctx.arc(item.start.x, item.start.y, Math.sqrt(dx * dx + dy * dy), 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await addDoc(collection(db, "rooms", roomCode, "messages"), {
      text,
      userId: userData?.name || userData?.teacherId,
      school: userData?.name || "Teacher",
      createdAt: serverTimestamp(),
    });
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await addDoc(collection(db, "rooms", roomCode, "tasks"), { text: newTask, completed: false, createdAt: serverTimestamp() });
    setNewTask("");
  };

  const toggleTask = async (task) => {
    await updateDoc(doc(db, "rooms", roomCode, "tasks", task.id), { completed: !task.completed });
  };

  const deleteTask = async (taskId) => {
    await deleteDoc(doc(db, "rooms", roomCode, "tasks", taskId));
  };

  const startDrawing = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setLines([{ x, y }]);
    setDrawing(true);
  };

  const stopDrawing = async (e) => {
    setDrawing(false);
    if (!startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (tool === "rect") {
      await addDoc(collection(db, "rooms", roomCode, "drawings"), { type: "rect", start: startPos, end: { x, y }, color, createdAt: serverTimestamp() });
    }
    if (tool === "circle") {
      await addDoc(collection(db, "rooms", roomCode, "drawings"), { type: "circle", start: startPos, end: { x, y }, color, createdAt: serverTimestamp() });
    }
    if (tool === "brush" && lines.length > 0) {
      await addDoc(collection(db, "rooms", roomCode, "drawings"), { type: "brush", lines, color, createdAt: serverTimestamp() });
      setLines([]);
    }
  };

  const draw = (e) => {
    if (!drawing || tool !== "brush") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLines((prev) => [...prev, { x, y }]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const prev = lines[lines.length - 1];
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const clearBoard = async () => {
    const snap = await getDocs(collection(db, "rooms", roomCode, "drawings"));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "rooms", roomCode, "drawings", d.id))));
    setLines([]);
  };

  const students = onlineUsers.filter(u => u.role === "student");
  const teachers = onlineUsers.filter(u => u.role === "teacher");

  return (
    <div className="min-h-screen bg-gray-100 p-4">

      {/* HEADER */}
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

      {/* ROOM INFO */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">🌏 {currentRoom.roomName}</h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                {currentRoom.languages.map((lang, i) => (
                  <span key={i} className="bg-sky-100 px-3 py-1 rounded-full text-sm">{lang}</span>
                ))}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
              <div className="font-semibold mb-1">⭐ Today's Mission</div>
              <div>{todayMission}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRESENCE BAR */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-500">🟢 Online now:</span>
            {onlineUsers.length === 0 && <span className="text-sm text-gray-400">No one yet</span>}
            {teachers.map(u => (
              <span key={u.uid} className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full">
                👩‍🏫 {u.name}
              </span>
            ))}
            {students.map(u => (
              <span key={u.uid} className="bg-sky-100 text-sky-800 text-sm px-3 py-1 rounded-full">
                👦 {u.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MAIN GRID */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* CHAT */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">💬 Messages</h2>
            <div className="h-40 overflow-y-auto bg-gray-100 rounded-xl p-2 text-sm">
              {messages.map((msg, i) => (
                <div key={i}><strong>{msg.school}:</strong> {msg.text}</div>
              ))}
            </div>
            <div className="flex mt-2 gap-2">
              <input
                className="flex-1 border rounded-xl px-2"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* VIDEO */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-4">🎥 Video Call</h2>
            <VideoCall
  roomCode={roomCode}
  currentUser={{
    uid: "test123",
    name: "Test User",
  }}
  onlineStudents={[
    {
      uid: "student456",
      name: "Another Student",
    },
  ]}
/>
          </CardContent>
        </Card>

        {/* CULTURAL */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">📸 Cultural Exchange</h2>
            <div className="h-40 bg-gray-100 rounded-xl p-2 text-sm">
              Upload drawings, photos, or projects
            </div>
            <Button className="mt-2 w-full">Upload</Button>
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
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseMove={draw}
            />
            <div className="flex gap-4 mt-3">
              {["black", "red", "blue", "green"].map((c) => (
                <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full border-2" style={{ background: c, borderColor: color === c ? "#999" : "transparent" }} />
              ))}
            </div>
            <div className="flex gap-3 mt-3">
              <Button onClick={() => setTool("brush")}>🖌️</Button>
              <Button onClick={() => setTool("rect")}>⬛️</Button>
              <Button onClick={() => setTool("circle")}>⚫️</Button>
              <Button onClick={clearBoard} variant="danger">Clear</Button>
            </div>
          </CardContent>
        </Card>

        {/* TASKS */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">🗓️ Tasks</h2>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border rounded-xl px-2"
                placeholder="Add activity..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <Button onClick={addTask} variant="secondary">Add</Button>
            </div>
            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-xl">
                  <span onClick={() => toggleTask(task)} className={`cursor-pointer ${task.completed ? "line-through text-gray-400" : ""}`}>
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
            <h2 className="font-semibold mb-4">🌏 Language Corner</h2>
            <LanguageCorner roomCode={roomCode} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
