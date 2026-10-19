import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const palId =
      body.pal_id || process.env.NEXT_PUBLIC_TAVUS_PAL_ID || "p8c17a8f2901";
    const conversationName =
      body.conversation_name || "Personal Technical Interview";
    const testMode = Boolean(body.test_mode);

    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey || apiKey === "your_tavus_api_key") {
      return NextResponse.json(
        {
          error: "Tavus API key is not configured.",
          details:
            "Please add TAVUS_API_KEY to your .env.local file (create one at https://maker.tavus.io/dev/api-keys).",
          mockUrl: `https://tavus.daily.co/mock-session-${palId}`,
        },
        { status: 401 }
      );
    }

    const payload: Record<string, any> = {
      pal_id: palId,
      conversation_name: conversationName,
      test_mode: testMode,
    };

    if (body.properties) {
      payload.properties = body.properties;
    }

    const tavusResponse = await fetch("https://tavusapi.com/v2/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await tavusResponse.json().catch(() => ({}));

    if (!tavusResponse.ok) {
      console.error("Tavus API returned error:", tavusResponse.status, data);
      return NextResponse.json(
        {
          error: data.message || data.error || "Failed to create Tavus conversation",
          details: data,
        },
        { status: tavusResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating Tavus conversation:", error);
    return NextResponse.json(
      { error: "Internal server error creating Tavus conversation", details: message },
      { status: 500 }
    );
  }
}
