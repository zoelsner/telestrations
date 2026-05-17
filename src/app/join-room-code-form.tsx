"use client";

import { DoorOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button, TextInput } from "@/components/ui";
import { validateRoomCode } from "@/domain/room-join";

export function JoinRoomCodeForm() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateRoomCode(roomCode);

    if (!result.ok) {
      setError(result.reason);
      return;
    }

    setError(null);
    router.push(`/room/${result.value}`);
  }

  return (
    <form className="mt-3 grid gap-3" onSubmit={handleSubmit}>
      <label>
        <span className="text-xs font-medium uppercase text-[var(--app-muted)]">
          Room code or link
        </span>
        <TextInput
          className="mt-2"
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="F7K2 or paste a room link"
          value={roomCode}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" type="submit" variant="primary">
        <DoorOpen size={16} />
        Join room
      </Button>
    </form>
  );
}
