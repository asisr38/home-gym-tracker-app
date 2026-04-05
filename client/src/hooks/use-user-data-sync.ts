import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { shallow } from "zustand/shallow";
import { userDataSchema, type UserData } from "@shared/userData";
import { supabase } from "@/lib/supabase";
import {
  hasPersistedUserState,
  rehydrateStore,
  setActiveUserId,
  useStore,
} from "@/lib/store";

const API_PATH = "/api/user-data";
const CLOUD_SYNC_UNAVAILABLE_STATUS = 503;
const USER_DATA_SYNC_TIMEOUT_MS = 4000;

const selectSyncData = (state: ReturnType<typeof useStore.getState>) => ({
  profile: state.profile,
  history: state.history,
  currentPlan: state.currentPlan,
});

class UserDataSyncError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const getUserDataSignature = (data: UserData) =>
  JSON.stringify({
    schemaVersion: data.schemaVersion ?? 0,
    profile: data.profile,
    history: data.history,
    currentPlan: data.currentPlan,
  });

async function getToken() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function fetchUserDataFromApi(signal?: AbortSignal) {
  const token = await getToken();
  if (!token) throw new UserDataSyncError("Not authenticated", 401);

  const res = await fetch(API_PATH, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new UserDataSyncError(text || "Failed to load user data", res.status);
  }

  const data = await res.json();
  return userDataSchema.parse(data);
}

async function fetchUserDataFromApiWithTimeout() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), USER_DATA_SYNC_TIMEOUT_MS);

  try {
    return await fetchUserDataFromApi(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UserDataSyncError("User data sync timed out.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function saveUserDataToApi(data: UserData) {
  const token = await getToken();
  if (!token) throw new UserDataSyncError("Not authenticated", 401);

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
    throw new UserDataSyncError(text || "Failed to save user data", res.status);
  }
}

export function useUserDataSync(user: User | null) {
  // Track which user ID the sync last completed for.
  // ready is derived: true only when the sync finished for the *current* user.
  const [readyUserId, setReadyUserId] = useState<string | null | undefined>(undefined);
  const ready = readyUserId !== undefined && readyUserId === (user?.id ?? null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const bootstrappingRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const saveTimeout = useRef<number | undefined>(undefined);
  const syncDisabledRef = useRef(false);
  const lastSyncedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      syncDisabledRef.current = false;
      lastSyncedSignatureRef.current = null;

      if (!user) {
        setSyncEnabled(false);
        setActiveUserId(null);
        await rehydrateStore();
        if (!cancelled) setReadyUserId(null);
        return;
      }

      setSyncEnabled(false);
      const hasLocalUserState = hasPersistedUserState(user.id);
      setActiveUserId(user.id);
      await rehydrateStore();
      if (!cancelled && hasLocalUserState) {
        setReadyUserId(user.id);
      }

      try {
        bootstrappingRef.current = true;
        const remoteData = await fetchUserDataFromApiWithTimeout();
        if (cancelled) return;

        setSyncEnabled(true);

        if (remoteData) {
          applyingRemoteRef.current = true;
          try {
            useStore.getState().applyUserData(remoteData);
          } finally {
            applyingRemoteRef.current = false;
          }

          const localData = useStore.getState().getUserData();
          const remoteSignature = getUserDataSignature(remoteData);
          const localSignature = getUserDataSignature(localData);
          lastSyncedSignatureRef.current = localSignature;

          if (remoteSignature !== localSignature) {
            await saveUserDataToApi(localData);
          }
        } else {
          const localData = useStore.getState().getUserData();
          lastSyncedSignatureRef.current = getUserDataSignature(localData);
          if (hasLocalUserState) {
            await saveUserDataToApi(localData);
          }
        }
      } finally {
        bootstrappingRef.current = false;
      }

      if (!cancelled) setReadyUserId(user.id);
    };

    sync().catch((error) => {
      if (
        error instanceof UserDataSyncError &&
        error.status === CLOUD_SYNC_UNAVAILABLE_STATUS
      ) {
        syncDisabledRef.current = true;
      }

      setSyncEnabled(false);
      if (!cancelled) setReadyUserId(user?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !syncEnabled) return;

    let previousData = selectSyncData(useStore.getState());

    const unsubscribe = useStore.subscribe((state) => {
      const nextData = selectSyncData(state);
      const changed = !shallow(previousData, nextData);
      previousData = nextData;

      if (
        !changed ||
        bootstrappingRef.current ||
        applyingRemoteRef.current ||
        syncDisabledRef.current
      ) {
        return;
      }

      window.clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(() => {
        const localData = useStore.getState().getUserData();
        const nextSignature = getUserDataSignature(localData);

        if (nextSignature === lastSyncedSignatureRef.current) return;

        saveUserDataToApi(localData)
          .then(() => {
            lastSyncedSignatureRef.current = nextSignature;
          })
          .catch((error) => {
            if (
              error instanceof UserDataSyncError &&
              error.status === CLOUD_SYNC_UNAVAILABLE_STATUS
            ) {
              syncDisabledRef.current = true;
              setSyncEnabled(false);
            }
            // Best-effort sync; network errors are handled silently.
          });
      }, 1000);
    });

    return () => {
      window.clearTimeout(saveTimeout.current);
      unsubscribe();
    };
  }, [syncEnabled, user?.id]);

  return { ready };
}
