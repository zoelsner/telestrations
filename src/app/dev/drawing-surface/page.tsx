import { notFound } from "next/navigation";

import { DrawingSurfacePreview } from "./drawing-surface-preview";

// Dev/e2e-only harness: renders the real in-game drawing surface with fixture
// data inside the same page shell as the room route, so mobile layout can be
// exercised without a Convex deployment. Hidden from production builds.
export default function DrawingSurfaceHarnessPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_E2E !== "1") {
    notFound();
  }

  return <DrawingSurfacePreview />;
}
