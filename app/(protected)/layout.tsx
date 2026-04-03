import { RouteGate } from "@/components/next/RouteGate";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RouteGate mode="protected">{children}</RouteGate>;
}
