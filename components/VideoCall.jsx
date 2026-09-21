"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { db } from "../lib/firebase";

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

const DEFAULT_ICE_SERVERS = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
  },
];

export default function VideoCall({
  roomCode,
  currentUser,
  onlineStudents,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);
  const [error, setError] = useState("");
  const [iceServers, setIceServers] = useState(
    DEFAULT_ICE_SERVERS
  );

  const myUid = currentUser?.uid;

  const myName =
    currentUser?.name ||
    currentUser?.displayName ||
    "Student";

  useEffect(() => {
    const loadTurnServers = async () => {
      try {
        const response = await fetch(
          "/api/turn-credentials"
        );

        if (!response.ok) {
          console.warn(
            "TURN credentials unavailable"
          );
          return;
        }

        const data = await response.json();

        if (data.iceServers) {
          setIceServers(data.iceServers);
          console.log("TURN servers loaded");
        }
      } catch (error) {
        console.warn(
          "Could not load TURN servers:",
          error
        );
      }
    };

    loadTurnServers();
  }, []);

  useEffect(() => {
    if (!myUid || !roomCode) return;

    const unsub = onSnapshot(
      doc(
        db,
        "rooms",
        roomCode,
        "calls",
        myUid
      ),
      (snap) => {
        if (!snap.exists()) return;

        const data = snap.data();

        if (
          data.type === "offer" &&
          callState === "idle"
        ) {
          setIncomingCall({
            from: data.fromName,
            callId: data.callId,
            fromUid: data.fromUid,
          });

          setCallState("incoming");
        }

        if (data.type === "hangup") {
          hangupCleanup();
        }
      }
    );

    return () => unsub();
  }, [myUid, roomCode, callState]);

  const startCamera = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCameraOn(true);
      setError("");
    } catch {
      setError(
        "Could not access camera or microphone."
      );
    }
  };

  const stopCamera = () => {
    localStreamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  const createPeerConnection = (
    callId,
    targetUid
  ) => {
    const pc = new RTCPeerConnection({
      iceServers,
    });

    pcRef.current = pc;

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => {
        pc.addTrack(
          track,
          localStreamRef.current
        );
      });

    pc.ontrack = (e) => {
      console.log(
        "📹 Remote stream received"
      );

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject =
          e.streams[0];
      }
    };

    pc.onicecandidate = async (e) => {
      if (!e.candidate) return;

      await addDoc(
        collection(
          db,
          "rooms",
          roomCode,
          "calls",
          callId,
          "candidates_" + myUid
        ),
        e.candidate.toJSON()
      );
    };

    pc.onconnectionstatechange = () => {
      console.log(
        "Connection State:",
        pc.connectionState
      );

      switch (pc.connectionState) {
        case "connected":
          setCallState("connected");
          break;

        case "disconnected":
        case "failed":
          hangupCleanup();
          break;

        case "connecting":
        case "new":
        case "closed":
          break;

        default:
          console.warn(
            "Unknown connection state:",
            pc.connectionState
          );
      }
    };

    return pc;
  };

  const callStudent = async (
    targetUid,
    targetName
  ) => {
    if (!cameraOn) {
      return setError(
        "Please start your camera first."
      );
    }

    if (!myUid) return;

    const callId = `${myUid}_${targetUid}_${Date.now()}`;

    setActiveCallId(callId);
    setCallState("calling");

    const pc = createPeerConnection(
      callId,
      targetUid
    );

    listenForCandidates(
      callId,
      targetUid,
      pc
    );

    const offer = await pc.createOffer();

    await pc.setLocalDescription(offer);

    try {
      await setDoc(
        doc(
          db,
          "rooms",
          roomCode,
          "calls",
          targetUid
        ),
        {
          type: "offer",
          offer: {
            type: offer.type,
            sdp: offer.sdp,
          },
          fromUid: myUid,
          fromName: myName,
          callId,
        }
      );

      console.log(
        "✅ Offer sent to",
        targetUid
      );
    } catch (err) {
      console.error(
        "❌ Failed to send offer",
        err
      );
    }

    const unsub = onSnapshot(
      doc(
        db,
        "rooms",
        roomCode,
        "calls",
        callId
      ),
      async (snap) => {
        if (!snap.exists()) return;

        const data = snap.data();

        if (
          data.type === "answer" &&
          !pc.currentRemoteDescription
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

          while (
            pendingCandidatesRef.current
              .length
          ) {
            await pc.addIceCandidate(
              pendingCandidatesRef.current.shift()
            );
          }

          unsub();

          listenForCandidates(
            callId,
            targetUid,
            pc
          );
        }

        if (data.type === "hangup") {
          unsub();
          hangupCleanup();
        }
      }
    );
  };

  const acceptCall = async () => {
    if (!cameraOn) {
      return setError(
        "Please start your camera first."
      );
    }

    if (!incomingCall) return;

    const {
      callId,
      fromUid,
    } = incomingCall;

    setActiveCallId(callId);
    setCallState("connected");

    const pc = createPeerConnection(
      callId,
      fromUid
    );

    const offerSnap = await getDoc(
      doc(
        db,
        "rooms",
        roomCode,
        "calls",
        myUid
      )
    );

    if (!offerSnap.exists()) return;

    const { offer } = offerSnap.data();

    await pc.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    while (
      pendingCandidatesRef.current.length
    ) {
      await pc.addIceCandidate(
        pendingCandidatesRef.current.shift()
      );
    }

    const answer =
      await pc.createAnswer();

    await pc.setLocalDescription(answer);

    await setDoc(
      doc(
        db,
        "rooms",
        roomCode,
        "calls",
        callId
      ),
      {
        type: "answer",
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      }
    );

    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall) return;

    await deleteDoc(
      doc(
        db,
        "rooms",
        roomCode,
        "calls",
        myUid
      )
    );

    setIncomingCall(null);
    setCallState("idle");
  };

  const listenForCandidates = (
    callId,
    uid,
    pc
  ) => {
    const colRef = collection(
      db,
      "rooms",
      roomCode,
      "calls",
      callId,
      "candidates_" + uid
    );

    return onSnapshot(
      colRef,
      (snap) => {
        snap.docChanges().forEach(
          async (change) => {
            if (change.type !== "added")
              return;

            const candidate =
              new RTCIceCandidate(
                change.doc.data()
              );

            if (pc.remoteDescription) {
              await pc.addIceCandidate(
                candidate
              );
            } else {
              pendingCandidatesRef.current.push(
                candidate
              );
            }
          }
        );
      }
    );
  };

  const hangup = async () => {
    if (activeCallId) {
      await setDoc(
        doc(
          db,
          "rooms",
          roomCode,
          "calls",
          activeCallId
        ),
        {
          type: "hangup",
        }
      );
    }

    if (myUid) {
      await deleteDoc(
        doc(
          db,
          "rooms",
          roomCode,
          "calls",
          myUid
        )
      );
    }

    hangupCleanup();
  };

  const hangupCleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallState("idle");
    setActiveCallId(null);
    setIncomingCall(null);
  };

  useEffect(() => {
    return () => {
      localStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());

      pcRef.current?.close();
    };
  }, []);

  const otherStudents = (
    onlineStudents || []
  ).filter((u) => u.uid !== myUid);

  return (
    <div className="space-y-3">

      {/* Videos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          <span className="absolute bottom-1 left-2 text-white text-xs bg-black/40 px-2 py-0.5 rounded-full">
            You
          </span>
        </div>

        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls
            className="w-full h-full object-cover"
          />

          {callState !== "connected" && (
            <span className="absolute text-gray-500 text-xs">
              No one connected
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">
          {error}
        </p>
      )}

      {/* Incoming call */}
      {callState === "incoming" &&
        incomingCall && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-sm">
            <p className="font-medium mb-2">
              📞 {incomingCall.from} is calling...
            </p>

            <div className="flex gap-2">
              <button
                onClick={acceptCall}
                className="bg-emerald-200 hover:bg-emerald-300 px-3 py-1.5 min-h-11 rounded-xl text-sm"
              >
                Accept
              </button>

              <button
                onClick={declineCall}
                className="bg-red-200 hover:bg-red-300 px-3 py-1.5 min-h-11 rounded-xl text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        )}

      {/* Camera + hangup controls */}
      <div className="flex gap-2 flex-wrap">
        {!cameraOn ? (
          <button
            onClick={startCamera}
            className="bg-emerald-200 hover:bg-emerald-300 px-4 py-2 min-h-11 rounded-2xl text-sm"
          >
            🎥 Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 min-h-11 rounded-2xl text-sm"
          >
            📷 Stop Camera
          </button>
        )}

        {(callState === "calling" ||
          callState === "connected") && (
          <button
            onClick={hangup}
            className="bg-red-200 hover:bg-red-300 px-4 py-2 min-h-11 rounded-2xl text-sm"
          >
            🔴 Hang Up
          </button>
        )}
      </div>

      {/* Call another student */}
      {callState === "idle" &&
        cameraOn &&
        otherStudents.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Call a student:
            </p>

            <div className="flex flex-wrap gap-2">
              {otherStudents.map((u) => (
                <button
                  key={u.uid}
                  onClick={() =>
                    callStudent(
                      u.uid,
                      u.name
                    )
                  }
                  className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-1.5 min-h-11 rounded-xl text-sm"
                >
                  📞 {u.name}
                </button>
              ))}
            </div>
          </div>
        )}

      {callState === "calling" && (
        <p className="text-xs text-gray-500 animate-pulse">
          ⏳ Waiting for them to accept...
        </p>
      )}

      {callState === "connected" && (
        <p className="text-xs text-emerald-600">
          🟢 Connected
        </p>
      )}

    </div>
  );
}