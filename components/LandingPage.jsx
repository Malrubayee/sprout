"use client";

import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function LandingPage({ onStudentJoin, onTeacherLogin }) {
  const { teacherSignIn, teacherSignUp, studentJoin } = useAuth();

  const [mode, setMode] = useState("student");          // "student" | "teacher"
  const [teacherTab, setTeacherTab] = useState("signin"); // "signin" | "signup"

  // Student fields
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Teacher fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStudentJoin = async () => {
    setError("");
    if (!name.trim()) return setError("Please enter your name.");
    if (!roomCode.trim()) return setError("Please enter a room code.");
    setLoading(true);
    try {
      await studentJoin(name.trim(), roomCode.trim().toUpperCase());
      onStudentJoin({ name: name.trim(), roomCode: roomCode.trim().toUpperCase() });
    } catch (e) {
      setError("Could not join room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSignIn = async () => {
    setError("");
    if (!email.trim() || !password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const cred = await teacherSignIn(email.trim(), password);
      onTeacherLogin({ teacherId: cred.user.uid });
    } catch (e) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSignUp = async () => {
    setError("");
    if (!displayName.trim() || !email.trim() || !password) return setError("Please fill in all fields.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const cred = await teacherSignUp(email.trim(), password, displayName.trim());
      onTeacherLogin({ teacherId: cred.user.uid });
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Email already registered. Sign in instead.");
      else setError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="bg-white rounded-3xl shadow-sm border p-8 w-full max-w-md">

        <h1 className="text-4xl font-semibold mb-1">🌱 Sprout</h1>
        <p className="text-gray-500 mb-6">Global Student Collaboration</p>

        {/* Role toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode("student"); setError(""); }}
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${mode === "student" ? "bg-sky-200 text-sky-900" : "bg-gray-100 text-gray-600"}`}
          >
            Student
          </button>
          <button
            onClick={() => { setMode("teacher"); setError(""); }}
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${mode === "teacher" ? "bg-emerald-200 text-emerald-900" : "bg-gray-100 text-gray-600"}`}
          >
            Teacher
          </button>
        </div>

        {/* STUDENT */}
        {mode === "student" && (
          <div className="space-y-4">
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
            />
            <input
              placeholder="Room code (e.g. JP-NZ-01)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStudentJoin()}
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              onClick={handleStudentJoin}
              disabled={loading}
              className="w-full bg-sky-200 hover:bg-sky-300 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "Joining..." : "Join Classroom"}
            </button>
          </div>
        )}

        {/* TEACHER */}
        {mode === "teacher" && (
          <div>
            {/* Sign in / Sign up sub-tabs */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setTeacherTab("signin"); setError(""); }}
                className={`flex-1 py-2 rounded-xl text-sm transition-all ${teacherTab === "signin" ? "bg-emerald-100 text-emerald-900 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTeacherTab("signup"); setError(""); }}
                className={`flex-1 py-2 rounded-xl text-sm transition-all ${teacherTab === "signup" ? "bg-emerald-100 text-emerald-900 font-medium" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Create Account
              </button>
            </div>

            <div className="space-y-4">
              {teacherTab === "signup" && (
                <input
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              )}
              <input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (teacherTab === "signin" ? handleTeacherSignIn() : handleTeacherSignUp())}
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                onClick={teacherTab === "signin" ? handleTeacherSignIn : handleTeacherSignUp}
                disabled={loading}
                className="w-full bg-emerald-200 hover:bg-emerald-300 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
              >
                {loading
                  ? "..."
                  : teacherTab === "signin"
                  ? "Enter Dashboard"
                  : "Create Account"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
