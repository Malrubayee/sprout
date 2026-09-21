"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { usePresence, subscribeToPresence } from "../lib/usePresence";
import LanguageCorner from "./LanguageCorner";
import VideoCall from "./VideoCall";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
  >
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  const styles = {
    primary: "bg-sky-200 text-sky-900 hover:bg-sky-300",
    secondary: "bg-emerald-200 text-emerald-900 hover:bg-emerald-300",
    danger: "bg-red-200 text-red-900 hover:bg-red-300",
  };

  return (
    <button
      className={`px-4 py-2 min-h-11 rounded-2xl shadow-sm transition-all duration-200 ${styles[variant]} ${className}`}
      {...props}
    >
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

  usePresence(
    roomCode,
    user?.uid,
    userData?.name || userData?.displayName || "Teacher",
    userData?.role || "student"
  );

  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPresence(roomCode, setOnlineUsers);
    return () => unsub();
  }, [roomCode]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [color, setColor] = useState("black");
  const [tool, setTool] = useState("brush");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState([]);

  // Whiteboard refs.
  // Refs are used instead of React state while drawing so rapid
  // finger movements on iPhone do not get lost between renders.
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const linesRef = useRef([]);
  const startPosRef = useRef(null);
  const lastPointRef = useRef(null);
  const activeTouchIdRef = useRef(null);
  const drawingsRef = useRef([]);

  const currentRoom =
    roomMetadata[roomCode] || roomMetadata["JP-NZ-01"];

  const todayMission =
    missions[new Date().getDate() % missions.length];

  // ---------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------

  useEffect(() => {
    const q = query(
      collection(db, "rooms", roomCode, "tasks"),
      orderBy("createdAt")
    );

    return onSnapshot(q, (snap) =>
      setTasks(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      )
    );
  }, [roomCode]);

  // ---------------------------------------------------------
  // DRAWINGS
  // ---------------------------------------------------------

  const redrawCanvas = (items = drawingsRef.current) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item) => {
      if (!item) return;

      ctx.strokeStyle = item.color || "black";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Brush
      if (item.type === "brush" && item.lines?.length > 0) {
        ctx.beginPath();
        ctx.moveTo(item.lines[0].x, item.lines[0].y);

        for (let i = 1; i < item.lines.length; i++) {
          ctx.lineTo(item.lines[i].x, item.lines[i].y);
        }

        ctx.stroke();
      }

      // Rectangle
      if (item.type === "rect" && item.start && item.end) {
        ctx.strokeRect(
          item.start.x,
          item.start.y,
          item.end.x - item.start.x,
          item.end.y - item.start.y
        );
      }

      // Circle
      if (item.type === "circle" && item.start && item.end) {
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

  useEffect(() => {
    const q = query(
      collection(db, "rooms", roomCode, "drawings"),
      orderBy("createdAt")
    );

    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => d.data());

      drawingsRef.current = items;

      // Wait one animation frame so the canvas definitely exists.
      requestAnimationFrame(() => {
        redrawCanvas(items);
      });
    });
  }, [roomCode]);

  // ---------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------

  useEffect(() => {
    const q = query(
      collection(db, "rooms", roomCode, "messages"),
      orderBy("createdAt")
    );

    return onSnapshot(q, (snap) =>
      setMessages(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      )
    );
  }, [roomCode]);

  // ---------------------------------------------------------
  // CANVAS COORDINATES
  // ---------------------------------------------------------

  const getCanvasPoint = (clientX, clientY) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  // ---------------------------------------------------------
  // DRAWING START
  // ---------------------------------------------------------

  const beginDrawing = (clientX, clientY) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const point = getCanvasPoint(clientX, clientY);

    drawingRef.current = true;
    startPosRef.current = point;
    lastPointRef.current = point;
    linesRef.current = [point];

    // For brush, draw a tiny dot immediately.
    if (tool === "brush") {
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // ---------------------------------------------------------
  // DRAWING MOVE
  // ---------------------------------------------------------

  const continueDrawing = (clientX, clientY) => {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;

    if (!canvas) return;

    const point = getCanvasPoint(clientX, clientY);

    if (tool === "brush") {
      const ctx = canvas.getContext("2d");
      const previous = lastPointRef.current;

      if (previous) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      linesRef.current.push(point);
      lastPointRef.current = point;
    }
  };

  // ---------------------------------------------------------
  // DRAWING END
  // ---------------------------------------------------------

  const finishDrawing = async (clientX, clientY) => {
    if (!drawingRef.current) return;

    const point = getCanvasPoint(clientX, clientY);

    drawingRef.current = false;

    const start = startPosRef.current;

    if (!start) {
      linesRef.current = [];
      lastPointRef.current = null;
      return;
    }

    try {
      // Rectangle
      if (tool === "rect") {
        await addDoc(
          collection(db, "rooms", roomCode, "drawings"),
          {
            type: "rect",
            start,
            end: point,
            color,
            createdAt: serverTimestamp(),
          }
        );
      }

      // Circle
      if (tool === "circle") {
        await addDoc(
          collection(db, "rooms", roomCode, "drawings"),
          {
            type: "circle",
            start,
            end: point,
            color,
            createdAt: serverTimestamp(),
          }
        );
      }

      // Brush
      if (tool === "brush" && linesRef.current.length > 0) {
        const finalLines = [
          ...linesRef.current,
          point,
        ];

        await addDoc(
          collection(db, "rooms", roomCode, "drawings"),
          {
            type: "brush",
            lines: finalLines,
            color,
            createdAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.error("Failed to save drawing:", error);
    }

    linesRef.current = [];
    startPosRef.current = null;
    lastPointRef.current = null;
  };

  // ---------------------------------------------------------
  // IPHONE / IPAD TOUCH EVENTS
  // ---------------------------------------------------------

  const handleTouchStart = (e) => {
    e.preventDefault();

    if (drawingRef.current) return;

    const touch = e.changedTouches[0];

    if (!touch) return;

    activeTouchIdRef.current = touch.identifier;

    beginDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();

    if (!drawingRef.current) return;

    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === activeTouchIdRef.current
    );

    if (!touch) return;

    continueDrawing(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = async (e) => {
    e.preventDefault();

    if (!drawingRef.current) return;

    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === activeTouchIdRef.current
    );

    if (!touch) return;

    activeTouchIdRef.current = null;

    await finishDrawing(
      touch.clientX,
      touch.clientY
    );
  };

  const handleTouchCancel = async (e) => {
    e.preventDefault();

    if (!drawingRef.current) return;

    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === activeTouchIdRef.current
    );

    activeTouchIdRef.current = null;

    if (touch) {
      await finishDrawing(
        touch.clientX,
        touch.clientY
      );
    } else {
      drawingRef.current = false;
      linesRef.current = [];
      startPosRef.current = null;
      lastPointRef.current = null;
    }
  };

  // ---------------------------------------------------------
  // LAPTOP / DESKTOP MOUSE EVENTS
  // ---------------------------------------------------------

  const handleMouseDown = (e) => {
    e.preventDefault();

    beginDrawing(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    e.preventDefault();

    continueDrawing(e.clientX, e.clientY);
  };

  const handleMouseUp = async (e) => {
    e.preventDefault();

    await finishDrawing(
      e.clientX,
      e.clientY
    );
  };

  const handleMouseLeave = async (e) => {
    if (!drawingRef.current) return;

    await finishDrawing(
      e.clientX,
      e.clientY
    );
  };

  // ---------------------------------------------------------
  // CLEAR WHITEBOARD
  // ---------------------------------------------------------

  const clearBoard = async () => {
    const snap = await getDocs(
      collection(db, "rooms", roomCode, "drawings")
    );

    await Promise.all(
      snap.docs.map((d) =>
        deleteDoc(
          doc(db, "rooms", roomCode, "drawings", d.id)
        )
      )
    );

    drawingsRef.current = [];
    linesRef.current = [];
    startPosRef.current = null;
    lastPointRef.current = null;
    drawingRef.current = false;

    redrawCanvas([]);
  };

  // ---------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------

  const sendMessage = async () => {
    if (!input.trim()) return;

    const text = input;
    setInput("");

    await addDoc(
      collection(db, "rooms", roomCode, "messages"),
      {
        text,
        userId:
          userData?.name ||
          userData?.teacherId,
        school:
          userData?.name ||
          "Teacher",
        createdAt: serverTimestamp(),
      }
    );
  };

  // ---------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------

  const addTask = async () => {
    if (!newTask.trim()) return;

    await addDoc(
      collection(db, "rooms", roomCode, "tasks"),
      {
        text: newTask,
        completed: false,
        createdAt: serverTimestamp(),
      }
    );

    setNewTask("");
  };

  const toggleTask = async (task) => {
    await updateDoc(
      doc(db, "rooms", roomCode, "tasks", task.id),
      {
        completed: !task.completed,
      }
    );
  };

  const deleteTask = async (taskId) => {
    await deleteDoc(
      doc(db, "rooms", roomCode, "tasks", taskId)
    );
  };

  // ---------------------------------------------------------
  // CLEAR CHAT
  // ---------------------------------------------------------

  const clearChat = async () => {
    const confirmed = window.confirm(
      "Clear all chat messages? This cannot be undone."
    );

    if (!confirmed) return;

    const snap = await getDocs(
      collection(db, "rooms", roomCode, "messages")
    );

    await Promise.all(
      snap.docs.map((d) =>
        deleteDoc(
          doc(db, "rooms", roomCode, "messages", d.id)
        )
      )
    );
  };

  const students = onlineUsers.filter(
    (u) => u.role === "student"
  );

  const teachers = onlineUsers.filter(
    (u) => u.role === "teacher"
  );

  return (
    <div className="min-h-[100dvh] bg-gray-100 p-2 sm:p-4 safe-area-x safe-area-bottom">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
        <div>
          <button
            onClick={leaveRoom}
            className="mb-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 min-h-11 rounded-2xl"
          >
            ← Leave Room
          </button>

          <h1 className="text-3xl sm:text-4xl font-medium">
            🌱 Sprout Room
          </h1>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xl text-gray-600">
            {roomCode}
          </div>

          <div className="text-sm text-gray-500">
            {userData?.role}
          </div>
        </div>
      </div>

      {/* ROOM INFO */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                🌏 {currentRoom.roomName}
              </h2>

              <div className="flex gap-2 mt-2 flex-wrap">
                {currentRoom.languages.map((lang, i) => (
                  <span
                    key={i}
                    className="bg-sky-100 px-3 py-1 rounded-full text-sm"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
              <div className="font-semibold mb-1">
                ⭐ Today's Mission
              </div>

              <div>{todayMission}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRESENCE BAR */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-500">
              🟢 Online now:
            </span>

            {onlineUsers.length === 0 && (
              <span className="text-sm text-gray-400">
                No one yet
              </span>
            )}

            {teachers.map((u) => (
              <span
                key={u.uid}
                className="bg-emerald-100 text-emerald-800 text-sm px-3 py-1 rounded-full"
              >
                👩‍🏫 {u.name}
              </span>
            ))}

            {students.map((u) => (
              <span
                key={u.uid}
                className="bg-sky-100 text-sky-800 text-sm px-3 py-1 rounded-full"
              >
                👦 {u.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">

        {/* CHAT */}
        <Card>
          <CardContent>
            <div className="flex justify-between items-center mb-2 gap-2">
              <h2 className="font-semibold">
                💬 Messages
              </h2>

              {userData?.role === "teacher" && (
                <Button
                  variant="danger"
                  onClick={clearChat}
                  className="px-3 py-1 text-sm"
                >
                  🗑️ Clear
                </Button>
              )}
            </div>

            <div className="h-40 overflow-y-auto bg-gray-100 rounded-xl p-2 text-sm">
              {messages.map((msg, i) => (
                <div key={i}>
                  <strong>{msg.school}:</strong>{" "}
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="flex mt-2 gap-2">
              <input
                className="flex-1 min-w-0 border rounded-xl px-3"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && sendMessage()
                }
              />

              <Button onClick={sendMessage}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* VIDEO */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-4">
              🎥 Video Call
            </h2>

            <VideoCall
              roomCode={roomCode}
              currentUser={{
                uid: user?.uid,
                name:
                  userData?.name ||
                  user?.displayName ||
                  "Student",
                displayName:
                  user?.displayName,
                role:
                  userData?.role ||
                  "student",
              }}
              onlineStudents={onlineUsers}
            />
          </CardContent>
        </Card>

        {/* CULTURAL */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">
              📸 Cultural Exchange
            </h2>

            <div className="h-40 bg-gray-100 rounded-xl p-2 text-sm">
              Upload drawings, photos, or projects
            </div>

            <Button className="mt-2 w-full">
              Upload
            </Button>
          </CardContent>
        </Card>

        {/* WHITEBOARD */}
        <Card className="md:col-span-2 xl:col-span-2">
          <CardContent>
            <h2 className="font-semibold mb-2">
              🖊️ Whiteboard
            </h2>

            <div
              className="w-full overflow-hidden rounded-xl border bg-white"
              style={{
                touchAction: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                WebkitTouchCallout: "none",
              }}
            >
              <canvas
                ref={canvasRef}
                width={870}
                height={400}
                className="block w-full h-auto"
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  aspectRatio: "870 / 400",
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  WebkitTouchCallout: "none",
                }}

                /* iPhone / iPad */
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}

                /* Laptop / desktop */
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}

                onContextMenu={(e) =>
                  e.preventDefault()
                }
              />
            </div>

            <div className="flex gap-3 mt-3 flex-wrap">
              {["black", "red", "blue", "green"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Select ${c}`}
                  className="w-11 h-11 rounded-full border-2 sprout-touch-target"
                  style={{
                    background: c,
                    borderColor:
                      color === c
                        ? "#999"
                        : "transparent",
                  }}
                />
              ))}
            </div>

            <div className="flex gap-3 mt-3 flex-wrap">
              <Button
                onClick={() => setTool("brush")}
                className={
                  tool === "brush"
                    ? "ring-2 ring-sky-500"
                    : ""
                }
              >
                🖌️
              </Button>

              <Button
                onClick={() => setTool("rect")}
                className={
                  tool === "rect"
                    ? "ring-2 ring-sky-500"
                    : ""
                }
              >
                ⬛️
              </Button>

              <Button
                onClick={() => setTool("circle")}
                className={
                  tool === "circle"
                    ? "ring-2 ring-sky-500"
                    : ""
                }
              >
                ⚫️
              </Button>

              <Button
                onClick={clearBoard}
                variant="danger"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TASKS */}
        <Card>
          <CardContent>
            <h2 className="font-semibold mb-2">
              🗓️ Tasks
            </h2>

            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 min-w-0 border rounded-xl px-3"
                placeholder="Add activity..."
                value={newTask}
                onChange={(e) =>
                  setNewTask(e.target.value)
                }
              />

              <Button
                onClick={addTask}
                variant="secondary"
              >
                Add
              </Button>
            </div>

            <ul className="space-y-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex justify-between items-center gap-2 bg-gray-100 p-2 rounded-xl"
                >
                  <span
                    onClick={() => toggleTask(task)}
                    className={`cursor-pointer flex-1 ${
                      task.completed
                        ? "line-through text-gray-400"
                        : ""
                    }`}
                  >
                    {task.text}
                  </span>

                  <button
                    onClick={() =>
                      deleteTask(task.id)
                    }
                    className="min-w-11 min-h-11 flex items-center justify-center"
                    aria-label="Delete task"
                  >
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* LANGUAGE */}
        <Card className="md:col-span-2 xl:col-span-3">
          <CardContent>
            <h2 className="font-semibold mb-4">
              🌏 Language Corner
            </h2>

            <LanguageCorner roomCode={roomCode} />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}