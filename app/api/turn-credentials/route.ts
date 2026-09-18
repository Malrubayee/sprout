import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL;

  if (!username || !credential) {
    return NextResponse.json(
      { error: "TURN credentials are not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
        ],
      },
      {
        urls: [
          "turn:aws-global-1.c.rstream.io:3478?transport=udp",
          "turn:aws-global-1.c.rstream.io:3478?transport=tcp",
          "turns:aws-global-1.c.rstream.io:5349?transport=tcp",
        ],
        username,
        credential,
      },
    ],
  });
}