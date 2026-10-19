import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

interface TokenRequestParams {
  room?: string | null;
  identity?: string | null;
  name?: string | null;
}

/**
 * Sanitizes input strings for LiveKit rooms and participant identities.
 * Enforces alphanumeric, dash, dot, and underscore characters and caps length to 64 chars.
 */
function sanitizeIdentifier(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_\-\.]/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 64) : fallback;
}

/**
 * Generates an AccessToken for the LiveKit SFU room.
 */
async function generateLiveKitToken(params: TokenRequestParams) {
  const defaultRoom = `interview-${Date.now().toString(36)}`;
  const defaultIdentity = `candidate-${Math.random().toString(36).substring(2, 8)}`;
  const defaultName = "Software Engineer Candidate";

  const room = sanitizeIdentifier(params.room, defaultRoom);
  const identity = sanitizeIdentifier(params.identity, defaultIdentity);
  const name = sanitizeIdentifier(params.name, defaultName);

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret) {
    return {
      error: "LiveKit server credentials are not configured.",
      details: "Please define LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env.local file.",
      status: 500,
    };
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    data: {
      token,
      room,
      identity,
      wsUrl: wsUrl || "wss://your-livekit-instance.livekit.cloud",
    },
    status: 200,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await generateLiveKitToken({
      room: searchParams.get("room"),
      identity: searchParams.get("identity"),
      name: searchParams.get("name"),
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating LiveKit token (GET):", error);
    return NextResponse.json({ error: "Failed to generate token", details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as TokenRequestParams;
    const result = await generateLiveKitToken(body);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error generating LiveKit token (POST):", error);
    return NextResponse.json({ error: "Failed to generate token", details: message }, { status: 500 });
  }
}
