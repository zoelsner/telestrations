import { RoomPageClient } from "./room-page-client";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <RoomPageClient code={code} convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} />
  );
}
