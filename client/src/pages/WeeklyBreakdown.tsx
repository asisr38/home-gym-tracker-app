import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { estimateDayMinutes, getCompletedSetsForDay, getPlannedSetsForDay, getWeeklyStats } from "@/lib/workout";
import { useLocation } from "wouter";

export default function WeeklyBreakdown() {
  const { currentPlan, profile } = useStore();
  const [, setLocation] = useLocation();

  if (!currentPlan.length) {
    return (
      <MobileShell>
        <div className="p-6">
          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">No sessions logged yet</h2>
                <p className="text-xs text-muted-foreground">Build a plan to track weekly progress.</p>
              </div>
              <Button className="w-full h-12" onClick={() => setLocation("/plan")}>
                Go to Plan
              </Button>
            </CardContent>
          </Card>
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
      <div className="p-6 space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{weeklyStats.completedSets} / {weeklyStats.plannedSets} sets completed</span>
              <span>~{weeklyMinutes} min planned</span>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {currentPlan.map((day) => {
            const plannedSets = getPlannedSetsForDay(day);
            const completedSets = getCompletedSetsForDay(day);
            const percent = plannedSets ? (completedSets / plannedSets) * 100 : 0;
            const targetLabel = plannedSets
              ? `${completedSets}/${plannedSets} sets`
              : day.runTarget?.distance
                ? `${day.runTarget.distance} ${profile.units === "imperial" ? "mi" : "km"} target`
                : "Recovery";
            return (
              <Card key={day.id} className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Day {day.dayNumber}: {day.title}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{day.type}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{targetLabel}</div>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}
