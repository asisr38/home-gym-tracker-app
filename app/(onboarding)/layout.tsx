import { RouteGate } from "@/components/next/RouteGate";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <RouteGate mode="protected" allowIncompleteOnboarding>{children}</RouteGate>;
}
