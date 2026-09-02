
"use client";

import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function LandingPage({
  onStudentJoin,
  onTeacherLogin,
  onParentSignup,
}) {
  const { teacherSignIn, teacherSignUp, studentJoin } = useAuth();

  const [mode, setMode] = useState("parent"); // "parent" | "student" | "teacher"
  const [teacherTab, setTeacherTab] = useState("signin");

  // Student fields
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Teacher fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Parent fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // STUDENT
  // -----------------------------
  const handleStudentJoin = async () => {
    setError("");

    if (!name.trim()) {
      return setError("Please enter your name.");
    }

    if (!roomCode.trim()) {
      return setError("Please enter a room code.");
    }

    setLoading(true);

    try {
      await studentJoin(
        name.trim(),
        roomCode.trim().toUpperCase()
      );

      onStudentJoin({
        name: name.trim(),
        roomCode: roomCode.trim().toUpperCase(),
      });
    } catch (e) {
      setError("Could not join room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // TEACHER SIGN IN
  // -----------------------------
  const handleTeacherSignIn = async () => {
    setError("");

    if (!email.trim() || !password) {
      return setError("Please fill in all fields.");
    }

    setLoading(true);

    try {
      const cred = await teacherSignIn(
        email.trim(),
        password
      );

      onTeacherLogin({
        teacherId: cred.user.uid,
      });
    } catch (e) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // TEACHER SIGN UP
  // -----------------------------
  const handleTeacherSignUp = async () => {
    setError("");

    if (
      !displayName.trim() ||
      !email.trim() ||
      !password
    ) {
      return setError("Please fill in all fields.");
    }

    if (password.length < 6) {
      return setError(
        "Password must be at least 6 characters."
      );
    }

    setLoading(true);

    try {
      const cred = await teacherSignUp(
        email.trim(),
        password,
        displayName.trim()
      );

      onTeacherLogin({
        teacherId: cred.user.uid,
      });
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        setError(
          "Email already registered. Sign in instead."
        );
      } else {
        setError(
          "Could not create account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // PARENT
  // -----------------------------
  const handleParentStart = async () => {
    setError("");

    if (!parentName.trim()) {
      return setError("Please enter your name.");
    }

    if (!parentEmail.trim()) {
      return setError("Please enter your email address.");
    }

    setLoading(true);

    try {
      // This will be connected to the actual
      // parent onboarding/Firebase flow later.
      if (onParentSignup) {
        await onParentSignup({
          parentName: parentName.trim(),
          parentEmail: parentEmail.trim(),
        });
      } else {
        // Temporary behaviour until parent authentication
        // is added to AuthContext.
        alert(
          "Thanks! The family onboarding system will be connected here."
        );
      }
    } catch (e) {
      setError(
        "Could not start family onboarding. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">

      <div className="bg-white rounded-3xl shadow-sm border p-8 w-full max-w-md">

        {/* LOGO / HEADER */}
        <div className="text-center mb-8">

          <div className="text-5xl mb-3">
            🌱
          </div>

          <h1 className="text-4xl font-semibold mb-2">
            Sprout
          </h1>

          <p className="text-gray-500">
            Helping children connect with the world.
          </p>

        </div>


        {/* ROLE SELECTOR */}
        <div className="grid grid-cols-3 gap-2 mb-7">

          <button
            onClick={() => {
              setMode("parent");
              setError("");
            }}
            className={`py-3 rounded-xl font-medium transition-all ${
              mode === "parent"
                ? "bg-emerald-200 text-emerald-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            👨‍👩‍👧
            <div className="text-xs mt-1">
              Family
            </div>
          </button>

          <button
            onClick={() => {
              setMode("student");
              setError("");
            }}
            className={`py-3 rounded-xl font-medium transition-all ${
              mode === "student"
                ? "bg-sky-200 text-sky-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🎒
            <div className="text-xs mt-1">
              Student
            </div>
          </button>

          <button
            onClick={() => {
              setMode("teacher");
              setError("");
            }}
            className={`py-3 rounded-xl font-medium transition-all ${
              mode === "teacher"
                ? "bg-emerald-200 text-emerald-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            🏫
            <div className="text-xs mt-1">
              School
            </div>
          </button>

        </div>


        {/* -------------------------------- */}
        {/* FAMILY */}
        {/* -------------------------------- */}

        {mode === "parent" && (

          <div>

            <div className="mb-6">

              <h2 className="text-2xl font-semibold mb-2">
                Sprout for Families
              </h2>

              <p className="text-gray-500 text-sm leading-relaxed">
                Give your child the opportunity to connect,
                collaborate and make friends with children
                around the world in a safe, guided environment.
              </p>

            </div>


            {/* BENEFITS */}

            <div className="space-y-3 mb-6">

              <div className="flex gap-3 items-start">
                <div className="text-xl">
                  🌏
                </div>

                <div>
                  <p className="font-medium">
                    Connect globally
                  </p>

                  <p className="text-sm text-gray-500">
                    Meet children from different countries
                    and cultures.
                  </p>
                </div>
              </div>


              <div className="flex gap-3 items-start">
                <div className="text-xl">
                  🤝
                </div>

                <div>
                  <p className="font-medium">
                    Learn together
                  </p>

                  <p className="text-sm text-gray-500">
                    Collaborate through guided projects,
                    conversations and activities.
                  </p>
                </div>
              </div>


              <div className="flex gap-3 items-start">
                <div className="text-xl">
                  🔒
                </div>

                <div>
                  <p className="font-medium">
                    Designed with privacy in mind
                  </p>

                  <p className="text-sm text-gray-500">
                    Children participate through controlled
                    Sprout experiences rather than an open
                    social network.
                  </p>
                </div>
              </div>

            </div>


            {/* CONSULTATION */}

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6">

              <p className="font-medium text-emerald-900 mb-1">
                🌱 Start with a free family consultation
              </p>

              <p className="text-sm text-emerald-800 leading-relaxed">
                We'll meet with you and your child to learn
                about their interests, goals and communication
                level, and help determine what kind of Sprout
                experience would suit them.
              </p>

            </div>


            {/* PARENT FORM */}

            <div className="space-y-4">

              <input
                placeholder="Parent / guardian name"
                value={parentName}
                onChange={(e) =>
                  setParentName(e.target.value)
                }
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />

              <input
                placeholder="Parent / guardian email"
                type="email"
                value={parentEmail}
                onChange={(e) =>
                  setParentEmail(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  handleParentStart()
                }
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />

              <button
                onClick={handleParentStart}
                disabled={loading}
                className="w-full bg-emerald-200 hover:bg-emerald-300 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
              >
                {loading
                  ? "Starting..."
                  : "Start Free Consultation"}
              </button>

            </div>

          </div>

        )}


        {/* -------------------------------- */}
        {/* STUDENT */}
        {/* -------------------------------- */}

        {mode === "student" && (

          <div className="space-y-4">

            <div className="mb-5">

              <h2 className="text-2xl font-semibold mb-1">
                Join Sprout
              </h2>

              <p className="text-gray-500 text-sm">
                Enter the details provided by your
                teacher or school.
              </p>

            </div>

            <input
              placeholder="Your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
            />

            <input
              placeholder="Room code (e.g. JP-NZ-01)"
              value={roomCode}
              onChange={(e) =>
                setRoomCode(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handleStudentJoin()
              }
              className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200"
            />

            <button
              onClick={handleStudentJoin}
              disabled={loading}
              className="w-full bg-sky-200 hover:bg-sky-300 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
            >
              {loading
                ? "Joining..."
                : "Join Classroom"}
            </button>

          </div>

        )}


        {/* -------------------------------- */}
        {/* TEACHER / SCHOOL */}
        {/* -------------------------------- */}

        {mode === "teacher" && (

          <div>

            <div className="mb-5">

              <h2 className="text-2xl font-semibold mb-1">
                For Schools
              </h2>

              <p className="text-gray-500 text-sm">
                Manage your students and international
                collaboration rooms.
              </p>

            </div>


            {/* SIGN IN / SIGN UP */}

            <div className="flex gap-2 mb-5">

              <button
                onClick={() => {
                  setTeacherTab("signin");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                  teacherTab === "signin"
                    ? "bg-emerald-100 text-emerald-900 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                Sign In
              </button>

              <button
                onClick={() => {
                  setTeacherTab("signup");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                  teacherTab === "signup"
                    ? "bg-emerald-100 text-emerald-900 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                Create Account
              </button>

            </div>


            <div className="space-y-4">

              {teacherTab === "signup" && (

                <input
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value)
                  }
                  className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                />

              )}


              <input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />


              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (
                    teacherTab === "signin"
                      ? handleTeacherSignIn()
                      : handleTeacherSignUp()
                  )
                }
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
              />


              <button
                onClick={
                  teacherTab === "signin"
                    ? handleTeacherSignIn
                    : handleTeacherSignUp
                }
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


        {/* ERROR */}

        {error && (

          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error}
          </div>

        )}

      </div>

    </div>
  );
}

