const PENDING_AUTH_MIGRATION_KEY = "iron-stride-pending-auth-migration";

export function clearPendingAuthMigration() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_AUTH_MIGRATION_KEY);
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : null;

  if (!message) return fallback;

  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "That email is already in use. Sign in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Use a password with at least 6 characters.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many attempts. Try again in a few minutes.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return fallback;
}
