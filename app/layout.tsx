import "@livekit/components-styles";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LiveKit Voice Interviewer | Technical Screening Dashboard",
  description:
    "Low-latency voice-based technical interviewer agent with intelligent probing and real-time Pydantic form state synchronization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
