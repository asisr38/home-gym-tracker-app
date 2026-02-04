import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Calendar, Trophy, ChevronRight, Flame, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { estimateDayMinutes, getWeeklyStats } from "@/lib/workout";

export default function Home() {
  const { profile, currentPlan } = useStore();
  const [, setLocation] = useLocation();

  const hasPlan = currentPlan.length > 0;
  const nextWorkout = currentPlan.find(d => !d.completed) || currentPlan[0];
  const weeklyStats = getWeeklyStats(currentPlan);
  const weeklyProgress = weeklyStats.plannedSets
    ? (weeklyStats.completedSets / weeklyStats.plannedSets) * 100
    : 0;

  const estimatedMinutes = nextWorkout ? estimateDayMinutes(nextWorkout) : 0;
  const isCardioDay = nextWorkout?.type !== "lift";
  const unitLabel = profile.units === "imperial" ? "mi" : "km";
  const runDistance = nextWorkout?.runTarget?.distance;
  const exerciseCount = nextWorkout?.exercises.length ?? 0;

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Today</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {format(new Date(), "EEEE, MMM do")}
            </h1>
          </div>
          <div className="h-10 w-10 rounded-full bg-muted/60 ring-1 ring-border flex items-center justify-center text-sm font-semibold">
            {profile.name.charAt(0)}
          </div>
        </div>

        {!hasPlan && (
          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">No workout scheduled today</h3>
                  <p className="text-xs text-muted-foreground">Build your plan to start tracking sessions.</p>
                </div>
              </div>
              <Button className="w-full h-12" onClick={() => setLocation("/plan")}>View Plan</Button>
            </CardContent>
          </Card>
        )}

        {hasPlan && nextWorkout && (
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="pb-3 space-y-2">
              <CardDescription className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Today's Workout
              </CardDescription>
              <CardTitle className="text-2xl font-semibold">{nextWorkout.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {isCardioDay ? (
                  <>
                    <span>{runDistance ? `${runDistance} ${unitLabel}` : "Cardio"}</span>
                    <span>•</span>
                    <span>~{estimatedMinutes} min</span>
                  </>
                ) : (
                  <>
                    <span>{exerciseCount} exercises</span>
                    <span>•</span>
                    <span>~{estimatedMinutes} min</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!nextWorkout.completed ? (
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  onClick={() => setLocation(`/session/${nextWorkout.id}`)}
                >
                  <Play className="h-5 w-5" /> Start Workout
                </Button>
              ) : (
                <Button variant="secondary" className="w-full h-12" disabled>
                  Workout Completed
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setLocation("/plan")}
                >
                  <Calendar className="h-4 w-4" /> View Plan
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setLocation("/history")}
                >
                  <BarChart3 className="h-4 w-4" /> Progress
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Progress */}
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setLocation("/weekly")}
          disabled={!hasPlan}
        >
          <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Weekly Volume
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(weeklyProgress)}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{weeklyStats.completedSets} / {weeklyStats.plannedSets} sets completed</span>
                <span>Tap for breakdown</span>
              </div>
            </CardContent>
          </Card>
        </button>

        {hasPlan && nextWorkout && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              This Week
            </h3>
            <div className="space-y-3">
              {currentPlan.slice(0, 5).map((day) => (
                <div 
                  key={day.id} 
                  className={cn(
                    "flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/40 hover:border-primary/40 hover:shadow-sm",
                    day.completed ? "bg-muted/20 border-primary/20" : "bg-card border-border/70",
                    day.id === nextWorkout.id && "ring-1 ring-primary border-primary"
                  )}
                  onClick={() => setLocation(`/session/${day.id}`)}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm mr-4 shadow-inner",
                    day.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {day.dayNumber}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{day.title}</h4>
                    <p className="text-xs text-muted-foreground capitalize">{day.type}</p>
                  </div>
                  {day.completed ? (
                    <Trophy className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
