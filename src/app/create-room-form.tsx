"use client";

import { useMutation } from "convex/react";
import { DoorOpen, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api } from "../../convex/_generated/api";
import { errorMessage } from "@/app/lib/error-message";
import { Button, TextInput } from "@/components/ui";
import { validateDisplayName } from "@/domain/room-join";
import { createPlayerToken, savePlayerToken } from "./room-session";

export function CreateRoomForm({ convexConfigured }: { convexConfigured: boolean }) {
  if (!convexConfigured) {
    return (
      <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
        Live rooms are unavailable until Convex is configured for this environment.
      </p>
    );
  }

  return <CreateRoomFormLive />;
}

function CreateRoomFormLive() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.createRoom);
  const [hostName, setHostName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hostNameResult = validateDisplayName(hostName);

    if (!hostNameResult.ok) {
      setError(hostNameResult.reason);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const playerToken = createPlayerToken();
      const room = await createRoom({
        hostName: hostNameResult.value,
        playerToken,
      });
      savePlayerToken(room.code, playerToken);
      router.push(room.sharePath);
    } catch (caughtError) {
      setError(errorMessage(caughtError, "Could not create the room."));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
      <label>
        <span className="text-xs font-medium uppercase text-[var(--app-muted)]">Your name</span>
        <TextInput
          className="mt-2"
          disabled={isSubmitting}
          onChange={(event) => setHostName(event.target.value)}
          placeholder="Maya"
          value={hostName}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <DoorOpen size={16} />}
        Create room
      </Button>
    </form>
  );
}
