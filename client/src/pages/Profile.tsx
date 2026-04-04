import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RotateCcw,
  Download,
  Upload,
  LogOut,
  LogIn,
  UserPlus,
  Cloud,
  ShieldCheck,
  Weight,
  Target,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { ToastAction } from "@/components/ui/toast";
import { useLocation } from "@/lib/router";
import { useState } from "react";
import { MetricPill, PageHeader, SectionHeading, SurfaceCard } from "@/components/ui/app-surfaces";

export default function Profile() {
  const { profile, exportData, importData, resetPlan, restorePlan } = useStore();
  const { user, signOutUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const isSignedOut = !user;
  const accountLabel = user?.email || "Not signed in";
  const cloudSyncDescription = user
    ? "Your plan and history sync to your signed-in account."
    : "You're using local-first storage only. Sign in to sync across devices.";
  const goalLabelMap: Record<string, string> = {
    strength: "Strength",
    hypertrophy: "Muscle Gain",
    endurance: "Endurance",
    fat_loss: "Fat Loss",
    balanced: "Balanced",
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironstride-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importData(event.target?.result as string);
      if (success) {
        toast({ title: "Import Successful", description: "Your history has been restored." });
      } else {
        toast({ title: "Import Failed", description: "Invalid file format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    const previousPlan = useStore.getState().currentPlan;
    resetPlan();
    toast({
      title: "Week reset",
      description: "Your plan was reset to Day 1.",
      action: (
        <ToastAction altText="Undo reset" onClick={() => restorePlan(previousPlan)}>
          Undo
        </ToastAction>
      ),
    });
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
      setLocation("/login");
      toast({
        title: "Signed out",
        description: "Sign in again to access your training data.",
      });
    } catch {
      toast({
        title: "Sign out failed",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <MobileShell>
      <div className="space-y-6 p-5">
        <PageHeader
          eyebrow="Settings"
          title="Profile, Account, Data"
          description="Your training identity, sync status, and recovery actions all live here."
          action={<MetricPill icon={Cloud} tone={user ? "emerald" : "default"}>{user ? "Sync on" : "Local only"}</MetricPill>}
        />

        <SurfaceCard tone="primary" className="p-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-eyebrow">Profile Snapshot</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">{profile.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{accountLabel}</p>
              </div>
              <div className="rounded-[1.1rem] border border-white/10 bg-background/40 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Goal</div>
                <div className="text-sm font-semibold">{goalLabelMap[profile.goalType]}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <MetricPill icon={Weight}>
                {profile.weight} {profile.units === "imperial" ? "lbs" : "kg"}
              </MetricPill>
              <MetricPill icon={Target} tone="primary">
                {profile.goal}
              </MetricPill>
              <MetricPill icon={ShieldCheck} tone={user ? "emerald" : "default"}>
                {user ? "Account linked" : "Guest mode"}
              </MetricPill>
            </div>

            <div className="rounded-[1.2rem] border border-border/60 bg-background/38 p-4">
              <div className="text-xs text-muted-foreground">Equipment available</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.equipment.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/60 bg-muted/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    {item.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border/60 bg-background/38 p-4">
              <div className="text-xs text-muted-foreground">Nutrition target</div>
              <div className="mt-2 text-sm font-medium">
                {profile.nutritionTarget || "Not set"}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SectionHeading
          icon={Cloud}
          title="Account & Data"
          description="Sync status, sign-in state, exports, and reset actions."
        />

        <SurfaceCard className="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-[1.2rem] border border-border/60 bg-background/38 p-4">
              <div>
                <p className="text-sm font-medium">Cloud Sync</p>
                <p className="text-xs text-muted-foreground">{cloudSyncDescription}</p>
              </div>
              <Switch checked={Boolean(user)} disabled />
            </div>
            {isSignedOut ? (
              <div className="grid grid-cols-2 gap-3">
                <Button className="w-full justify-start" onClick={() => setLocation("/login")}>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/register")}>
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> {signingOut ? "Signing Out..." : "Sign Out"}
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export Data (JSON)
            </Button>
            
            <div className="relative">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" /> Import Data
              </Button>
              <Input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleImport}
                accept=".json"
              />
            </div>

            <Separator />

            <Button variant="destructive" className="w-full justify-start" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Current Week
            </Button>
          </div>
        </SurfaceCard>

        <div className="text-center text-xs text-muted-foreground">
          v1.0.0 • Offline First
        </div>
      </div>
    </MobileShell>
  );
}
