import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { shallow } from "zustand/shallow";
import { userDataSchema, type UserData } from "@shared/userData";
import {
  rehydrateStore,
  setActiveUserId,
  useStore,
} from "@/lib/store";

const API_PATH = "/api/user-data";

async function fetchUserData(user: User) {
  const token = await user.getIdToken();
  const res = await fetch(API_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load user data");
  }

  const data = await res.json();
  return userDataSchema.parse(data);
}

async function saveUserData(user: User, data: UserData) {
  const token = await user.getIdToken();
  const res = await fetch(API_PATH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...data, updatedAt: Date.now() }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to save user data");
  }
}

export function useUserDataSync(user: User | null) {
  const [ready, setReady] = useState(false);
  const bootstrappingRef = useRef(false);
  const saveTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      if (!user) {
        setActiveUserId(null);
        await rehydrateStore();
        if (!cancelled) setReady(true);
        return;
      }

      setReady(false);
      setActiveUserId(user.uid);
      await rehydrateStore();

      try {
        bootstrappingRef.current = true;
        const remoteData = await fetchUserData(user);
        if (remoteData) {
          useStore.getState().applyUserData(remoteData);
        } else {
          await saveUserData(user, useStore.getState().getUserData());
        }
      } finally {
        bootstrappingRef.current = false;
      }

      if (!cancelled) setReady(true);
    };

    sync().catch(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = useStore.subscribe(
      (state) => ({
        profile: state.profile,
        history: state.history,
        currentPlan: state.currentPlan,
      }),
      (data) => {
        if (bootstrappingRef.current) return;
        window.clearTimeout(saveTimeout.current);
        saveTimeout.current = window.setTimeout(() => {
          saveUserData(user, data).catch(() => {
            // Best-effort sync; network errors are handled silently.
          });
        }, 1000);
      },
      { equalityFn: shallow },
    );

    return () => {
      window.clearTimeout(saveTimeout.current);
      unsubscribe();
    };
  }, [user?.uid]);

  return { ready };
}
