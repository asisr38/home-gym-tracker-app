import { RouteGate } from "@/components/next/RouteGate";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <RouteGate mode="public">{children}</RouteGate>;
}
