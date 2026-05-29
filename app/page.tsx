"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import LandingPage from "../components/LandingPage";
import TeacherDashboard from "../components/TeacherDashboard";
import SproutRoom from "../components/SproutRoom";

export default function SproutApp() {
  const { user, sproutUser, loading, logout } = useAuth();
  const [appMode, setAppMode] = useState<"landing" | "teacher-dashboard" | "room">("landing");
  const [selectedRoom, setSelectedRoom] = useState("");

  // Only used for restoring session on page refresh
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAppMode("landing");
      return;
    }
    if (sproutUser?.role === "teacher" && appMode === "landing") {
      setAppMode("teacher-dashboard");
    } else if (sproutUser?.role === "student" && sproutUser.roomCode && appMode === "landing") {
      setSelectedRoom(sproutUser.roomCode);
      setAppMode("room");
    }
  }, [loading, user, sproutUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  // These are called directly by LandingPage buttons — no waiting for useEffect
  const handleStudentJoin = (data: { name: string; roomCode: string }) => {
    setSelectedRoom(data.roomCode);
    setAppMode("room");
  };

  const handleTeacherLogin = (_data: { teacherId: string }) => {
    setAppMode("teacher-dashboard");
  };

  const handleRoomSelect = (roomCode: string) => {
    setSelectedRoom(roomCode);
    setAppMode("room");
  };

  const leaveRoom = async () => {
    if (sproutUser?.role === "teacher") {
      setAppMode("teacher-dashboard");
    } else {
      await logout();
      setAppMode("landing");
    }
  };

  const handleLogout = async () => {
    await logout();
    setAppMode("landing");
    setSelectedRoom("");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {user && appMode !== "landing" && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleLogout}
            className="bg-white border shadow-sm text-sm px-4 py-2 rounded-2xl hover:bg-gray-50 text-gray-600"
          >
            Sign out
          </button>
        </div>
      )}

      {appMode === "landing" && (
        <LandingPage
          onStudentJoin={handleStudentJoin}
          onTeacherLogin={handleTeacherLogin}
        />
      )}

      {appMode === "teacher-dashboard" && (
        <TeacherDashboard onSelectRoom={handleRoomSelect} />
      )}

      {appMode === "room" && (
        <SproutRoom
          roomCode={selectedRoom}
          userData={sproutUser}
          leaveRoom={leaveRoom}
        />
      )}
    </div>
  );
}
