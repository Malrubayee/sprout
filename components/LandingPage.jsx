
"use client";

import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function LandingPage({ onStudentJoin, onTeacherLogin }) {
  const { teacherSignIn, teacherSignUp, studentJoin } = useAuth();

  const [mode, setMode] = useState("family");
  const [teacherTab, setTeacherTab] = useState("signin");

  // Student fields
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Teacher fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Family fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [familySubmitted, setFamilySubmitted] = useState(false);

  // --------------------------------
  // STUDENT JOIN
  // --------------------------------

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

  // --------------------------------
  // TEACHER SIGN IN
  // --------------------------------

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

  // --------------------------------
  // TEACHER SIGN UP
  // --------------------------------

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

  // --------------------------------
  // FAMILY CONSULTATION
  // --------------------------------

  const handleFamilySubmit = () => {
    setError("");

    if (!parentName.trim()) {
      return setError("Please enter your name.");
    }

    if (!parentEmail.trim()) {
      return setError("Please enter your email address.");
    }

    setLoading(true);

    // For now, this simply confirms the request.
    // We can connect this to Firebase later.
    setTimeout(() => {
      setLoading(false);
      setFamilySubmitted(true);
    }, 500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">

      <div className="bg-white rounded-3xl shadow-sm border p-8 w-full max-w-md">

        {/* HEADER */}

        <div className="text-center mb-8">

          <div className="text-5xl mb-3">
            🌱
          </div>

          <h1 className="text-4xl font-semibold mb-1">
            Sprout
          </h1>

          <p className="text-gray-500">
            Connecting children with the world
          </p>

        </div>


        {/* ROLE SELECTOR */}

        <div className="flex gap-2 mb-6">

          <button
            onClick={() => {
              setMode("family");
              setError("");
              setFamilySubmitted(false);
            }}
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${
              mode === "family"
                ? "bg-emerald-200 text-emerald-900"
                : "bg-gray-100 text-gray-600"
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
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${
              mode === "student"
                ? "bg-sky-200 text-sky-900"
                : "bg-gray-100 text-gray-600"
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
            className={`flex-1 py-2 rounded-xl font-medium transition-all ${
              mode === "teacher"
                ? "bg-emerald-200 text-emerald-900"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            🏫
            <div className="text-xs mt-1">
              School
            </div>
          </button>

        </div>


        {/* ================================= */}
        {/* FAMILY */}
        {/* ================================= */}

        {mode === "family" && (

          <div>

            {!familySubmitted ? (

              <>
                <h2 className="text-2xl font-semibold mb-2">
                  Sprout for Families
                </h2>

                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Give your child the opportunity to connect,
                  collaborate and make friends with children
                  around the world.
                </p>


                {/* FEATURES */}

                <div className="space-y-4 mb-6">

                  <div className="flex gap-3">

                    <div className="text-xl">
                      🌏
                    </div>

                    <div>
                      <p className="font-medium">
                        Connect with the world
                      </p>

                      <p className="text-sm text-gray-500">
                        Meet children from different countries
                        and cultures.
                      </p>
                    </div>

                  </div>


                  <div className="flex gap-3">

                    <div className="text-xl">
                      🤝
                    </div>

                    <div>
                      <p className="font-medium">
                        Learn together
                      </p>

                      <p className="text-sm text-gray-500">
                        Work together through fun projects
                        and activities.
                      </p>
                    </div>

                  </div>


                  <div className="flex gap-3">

                    <div className="text-xl">
                      🔒
                    </div>

                    <div>
                      <p className="font-medium">
                        Designed with privacy in mind
                      </p>

                      <p className="text-sm text-gray-500">
                        Sprout is designed as a controlled
                        environment rather than an open
                        social network.
                      </p>
                    </div>

                  </div>

                </div>


                {/* CONSULTATION BOX */}

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-6">

                  <p className="font-medium text-emerald-900 mb-1">
                    🌱 Start with a free consultation
                  </p>

                  <p className="text-sm text-emerald-800 leading-relaxed">
                    Before your child joins Sprout, a member
                    of the QT team will meet with you and your
                    child to understand their interests,
                    goals and learning needs.
                  </p>

                </div>


                {/* FAMILY FORM */}

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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleFamilySubmit();
                      }
                    }}
                    className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                  />


                  <button
                    onClick={handleFamilySubmit}
                    disabled={loading}
                    className="w-full bg-emerald-200 hover:bg-emerald-300 py-3 rounded-2xl font-medium disabled:opacity-50 transition-all"
                  >
                    {loading
                      ? "Submitting..."
                      : "Request Free Consultation"}
                  </button>

                </div>

              </>

            ) : (

              /* SUCCESS MESSAGE */

              <div className="text-center py-6">

                <div className="text-5xl mb-4">
                  🌱
                </div>

                <h2 className="text-2xl font-semibold mb-3">
                  Thanks, {parentName}!
                </h2>

                <p className="text-gray-500 leading-relaxed mb-6">
                  We've received your request for a free
                  Sprout family consultation.
                </p>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-left">

                  <p className="font-medium text-emerald-900 mb-2">
                    What happens next?
                  </p>

                  <p className="text-sm text-emerald-800 leading-relaxed">
                    A member of the QT team will get in touch
                    with you at the email address you provided
                    to arrange a convenient time to meet with
                    you and your child.
                  </p>

                </div>

              </div>

            )}

          </div>

        )}


        {/* ================================= */}
        {/* STUDENT */}
        {/* ================================= */}

        {mode === "student" && (

          <div className="space-y-4">

            <h2 className="text-2xl font-semibold mb-1">
              Join Classroom
            </h2>

            <p className="text-gray-500 text-sm mb-5">
              Enter the details provided by your teacher.
            </p>

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


        {/* ================================= */}
        {/* SCHOOL / TEACHER */}
        {/* ================================= */}

        {mode === "teacher" && (

          <div>

            <h2 className="text-2xl font-semibold mb-1">
              For Schools
            </h2>

            <p className="text-gray-500 text-sm mb-5">
              Manage your students and international
              collaboration rooms.
            </p>


            {/* TABS */}

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

