import { MobileShell } from "@/components/layout/MobileShell";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { estimateDayMinutes, getCompletedSetsForDay, getPlannedSetsForDay, getWeeklyStats } from "@/lib/workout";
import { useLocation } from "@/lib/router";
import { MetricPill, PageHeader, SurfaceCard } from "@/components/ui/app-surfaces";
import { getWorkoutTypeLabel, getWorkoutVisual } from "@/lib/day-ui";
import { BarChart3, CheckCircle2, Clock3, Dumbbell } from "lucide-react";

export default function WeeklyBreakdown() {
  const { currentPlan, profile } = useStore();
  const [, setLocation] = useLocation();

  if (!currentPlan.length) {
    return (
      <MobileShell>
        <div className="p-5">
          <SurfaceCard tone="primary" className="p-5">
            <div className="space-y-4">
              <div>
                <p className="text-eyebrow">Weekly Breakdown</p>
                <h2 className="text-xl font-semibold tracking-[-0.03em]">No sessions logged yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">Build a plan to track weekly progress.</p>
              </div>
              <Button className="w-full" onClick={() => setLocation("/plan")}>
                Go to Plan
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </MobileShell>
    );
  }

  const weeklyStats = getWeeklyStats(currentPlan);
  const weeklyMinutes = currentPlan.reduce((acc, day) => acc + estimateDayMinutes(day), 0);
  const weeklyProgress = weeklyStats.plannedSets
    ? (weeklyStats.completedSets / weeklyStats.plannedSets) * 100
    : 0;

  return (
    <MobileShell>
      <div className="space-y-6 p-5">
        <PageHeader
          eyebrow="Weekly Breakdown"
          title="Volume Across The Split"
          description="See how each day contributes to the week and where the remaining work sits."
        />

        <SurfaceCard tone="primary" className="p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <MetricPill icon={CheckCircle2} tone="emerald">
                {weeklyStats.completedSets} / {weeklyStats.plannedSets} sets
              </MetricPill>
              <MetricPill icon={Clock3}>
                ~{weeklyMinutes} min planned
              </MetricPill>
              <MetricPill icon={Dumbbell}>
                {currentPlan.length} days in split
              </MetricPill>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall completion</span>
                <span>{Math.round(weeklyProgress)}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-2.5 bg-primary/12" />
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-3">
          {currentPlan.map((day) => {
            const plannedSets = getPlannedSetsForDay(day);
            const completedSets = getCompletedSetsForDay(day);
            const percent = plannedSets ? (completedSets / plannedSets) * 100 : 0;
            const visual = getWorkoutVisual(day.dayType, day.type);
            const VisualIcon = visual.icon;
            const targetLabel = plannedSets
              ? `${completedSets}/${plannedSets} sets`
              : day.runTarget?.distance
                ? `${day.runTarget.distance} ${profile.units === "imperial" ? "mi" : "km"} target`
                : "Recovery";
            return (
              <SurfaceCard key={day.id} tone={visual.tone} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-background/45">
                          <VisualIcon className={visual.accentClassName} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            Day {day.dayNumber}
                          </div>
                          <div className="text-sm font-semibold">{day.title}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground capitalize">
                        {getWorkoutTypeLabel(day.dayType, day.type)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{targetLabel}</div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{day.completed ? "Completed" : "In progress"}</span>
                    <span>{Math.round(percent)}%</span>
                  </div>
                  <Progress value={percent} className="h-2 bg-white/8" />
                </div>
              </SurfaceCard>
            );
          })}
        </div>

        <Button variant="outline" className="w-full" onClick={() => setLocation("/plan")}>
          <BarChart3 className="h-4 w-4" />
          Back to Plan
        </Button>
      </div>
    </MobileShell>
  );
}
