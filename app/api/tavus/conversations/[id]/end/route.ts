import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey || apiKey === "your_tavus_api_key") {
      return NextResponse.json(
        { error: "Tavus API key is not configured." },
        { status: 401 }
      );
    }

    const tavusResponse = await fetch(
      `https://tavusapi.com/v2/conversations/${encodeURIComponent(id)}/end`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    if (tavusResponse.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await tavusResponse.json().catch(() => ({}));

    if (!tavusResponse.ok) {
      return NextResponse.json(
        {
          error: data.message || data.error || "Failed to end Tavus conversation",
          details: data,
        },
        { status: tavusResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error ending Tavus conversation:", error);
    return NextResponse.json(
      { error: "Internal server error ending Tavus conversation", details: message },
      { status: 500 }
    );
  }
}
