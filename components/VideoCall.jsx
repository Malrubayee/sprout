"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, deleteDoc, getDocs
} from "firebase/firestore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCall({ roomCode, currentUser, onlineStudents }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected
  const [incomingCall, setIncomingCall] = useState(null); // { from, callId }
  const [activeCallId, setActiveCallId] = useState(null);
  const [error, setError] = useState("");

  const myUid = currentUser?.uid;
  const myName = currentUser?.name || currentUser?.displayName || "Student";
  console.log("MY UID:", myUid);
  console.log("CURRENT USER:", currentUser);
  console.log("ONLINE STUDENTS:", onlineStudents);


  // Listen for incoming calls
  useEffect(() => {
    if (!myUid || !roomCode) return;
    const unsub = onSnapshot(doc(db, "rooms", roomCode, "calls", myUid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.type === "offer" && callState === "idle") {
        setIncomingCall({ from: data.fromName, callId: data.callId, fromUid: data.fromUid });
        setCallState("incoming");
      }
      if (data.type === "hangup") {
        hangupCleanup();
      }
    });
    return () => unsub();
  }, [myUid, roomCode, callState]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCameraOn(true);
      setError("");
    } catch {
      setError("Could not access camera or microphone.");
    }
  };

  const stopCamera = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const createPeerConnection = (callId, targetUid) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
    });

    // When we get remote stream
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    // Send ICE candidates to Firestore
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await addDoc(collection(db, "rooms", roomCode, "calls", callId, "candidates_" + myUid), e.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallState("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") hangupCleanup();
    };

    return pc;
  };

  // CALLER: initiate a call
  const callStudent = async (targetUid, targetName) => {
    if (!cameraOn) return setError("Please start your camera first.");
    if (!myUid) return;

    const callId = `${myUid}_${targetUid}_${Date.now()}`;
    setActiveCallId(callId);
    setCallState("calling");

    const pc = createPeerConnection(callId, targetUid);

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer to target
    await setDoc(doc(db, "rooms", roomCode, "calls", targetUid), {
      type: "offer",
      callId,
      fromUid: myUid,
      fromName: myName,
      offer: { type: offer.type, sdp: offer.sdp },
    });

    // Listen for answer
    const unsub = onSnapshot(doc(db, "rooms", roomCode, "calls", callId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.type === "answer" && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        unsub();
        // Start listening for their ICE candidates
        listenForCandidates(callId, targetUid, pc);
      }
      if (data.type === "hangup") {
        unsub();
        hangupCleanup();
      }
    });

    // Listen for their ICE candidates
    listenForCandidates(callId, myUid, pc);
  };

  // CALLEE: accept incoming call
  const acceptCall = async () => {
    if (!cameraOn) return setError("Please start your camera first.");
    if (!incomingCall) return;

    const { callId, fromUid } = incomingCall;
    setActiveCallId(callId);
    setCallState("connected");

    const pc = createPeerConnection(callId, fromUid);

    // Get the offer
    const offerSnap = await getDoc(doc(db, "rooms", roomCode, "calls", myUid));
    const { offer } = offerSnap.data();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Send answer
    await setDoc(doc(db, "rooms", roomCode, "calls", callId), {
      type: "answer",
      answer: { type: answer.type, sdp: answer.sdp },
    });

    // Listen for caller's ICE candidates
    listenForCandidates(callId, fromUid, pc);
    listenForCandidates(callId, myUid, pc);

    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    await deleteDoc(doc(db, "rooms", roomCode, "calls", myUid));
    setIncomingCall(null);
    setCallState("idle");
  };

  const listenForCandidates = (callId, uid, pc) => {
    const colRef = collection(db, "rooms", roomCode, "calls", callId, "candidates_" + uid);
    return onSnapshot(colRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  const hangup = async () => {
    // Notify the other side
    if (activeCallId) {
      await setDoc(doc(db, "rooms", roomCode, "calls", activeCallId), { type: "hangup" });
    }
    if (myUid) {
      await deleteDoc(doc(db, "rooms", roomCode, "calls", myUid));
    }
    hangupCleanup();
  };

  const hangupCleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState("idle");
    setActiveCallId(null);
    setIncomingCall(null);
  };

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  const otherStudents = (onlineStudents || []).filter(u => u.uid !== myUid);

  return (
    <div className="space-y-3">

      {/* Videos */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative bg-black rounded-2xl overflow-hidden h-36">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <span className="absolute bottom-1 left-2 text-white text-xs bg-black/40 px-2 py-0.5 rounded-full">You</span>
        </div>
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden h-36 flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {callState !== "connected" && (
            <span className="absolute text-gray-500 text-xs">No one connected</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Incoming call */}
      {callState === "incoming" && incomingCall && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-sm">
          <p className="font-medium mb-2">📞 {incomingCall.from} is calling...</p>
          <div className="flex gap-2">
            <button onClick={acceptCall} className="bg-emerald-200 hover:bg-emerald-300 px-3 py-1.5 rounded-xl text-sm">
              Accept
            </button>
            <button onClick={declineCall} className="bg-red-200 hover:bg-red-300 px-3 py-1.5 rounded-xl text-sm">
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Camera + hangup controls */}
      <div className="flex gap-2 flex-wrap">
        {!cameraOn ? (
          <button onClick={startCamera} className="bg-emerald-200 hover:bg-emerald-300 px-4 py-2 rounded-2xl text-sm">
            🎥 Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-2xl text-sm">
            📷 Stop Camera
          </button>
        )}
        {(callState === "calling" || callState === "connected") && (
          <button onClick={hangup} className="bg-red-200 hover:bg-red-300 px-4 py-2 rounded-2xl text-sm">
            🔴 Hang Up
          </button>
        )}
      </div>

      {/* Call another student */}
      {callState === "idle" && cameraOn && otherStudents.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Call a student:</p>
          <div className="flex flex-wrap gap-2">
            {otherStudents.map(u => (
              <button
                key={u.uid}
                onClick={() => callStudent(u.uid, u.name)}
                className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1.5 rounded-xl text-sm"
              >
                📞 {u.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {callState === "calling" && (
        <p className="text-xs text-gray-500 animate-pulse">⏳ Waiting for them to accept...</p>
      )}

      {callState === "connected" && (
        <p className="text-xs text-emerald-600">🟢 Connected</p>
      )}

    </div>
  );
}