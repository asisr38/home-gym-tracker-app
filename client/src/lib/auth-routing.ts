export function getAuthenticatedHomePath(onboardingCompleted: boolean) {
  return onboardingCompleted ? "/" : "/onboarding";
}
