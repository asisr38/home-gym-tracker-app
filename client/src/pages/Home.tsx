import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Calendar,
  Trophy,
  ChevronRight,
  Flame,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import { useLocation } from "@/lib/router";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { estimateDayMinutes, getScheduledWorkoutForDate, getWeeklyStats } from "@/lib/workout";
import { MetricPill, PageHeader, SectionHeading, SurfaceCard } from "@/components/ui/app-surfaces";
import { getWorkoutVisual, getWorkoutTypeLabel } from "@/lib/day-ui";

export default function Home() {
  const { profile, currentPlan } = useStore();
  const [, setLocation] = useLocation();

  const hasPlan = currentPlan.length > 0;
  const nextWorkout = getScheduledWorkoutForDate(currentPlan);
  const weeklyStats = getWeeklyStats(currentPlan);
  const weeklyProgress = weeklyStats.plannedSets
    ? (weeklyStats.completedSets / weeklyStats.plannedSets) * 100
    : 0;

  const estimatedMinutes = nextWorkout ? estimateDayMinutes(nextWorkout) : 0;
  const isCardioDay = nextWorkout?.type !== "lift";
  const unitLabel = profile.units === "imperial" ? "mi" : "km";
  const runDistance = nextWorkout?.runTarget?.distance;
  const exerciseCount = nextWorkout?.exercises.length ?? 0;
  const trainingDays = currentPlan.filter((day) => day.exercises.length > 0).length;
  const completedDays = currentPlan.filter((day) => day.completed).length;
  const heroVisual = nextWorkout
    ? getWorkoutVisual(nextWorkout.dayType, nextWorkout.type)
    : null;
  const HeroIcon = heroVisual?.icon;

  return (
    <MobileShell>
      <div className="space-y-6 p-5">
        <PageHeader
          eyebrow="Today"
          title={format(new Date(), "EEEE, MMM do")}
          description="Your next session, weekly momentum, and the fastest way back into training."
          action={
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-border/60 bg-card/75 text-sm font-bold shadow-sm">
              {profile.name.charAt(0)}
            </div>
          }
        />

        <div className="flex flex-wrap gap-2">
          <MetricPill icon={Dumbbell} tone="primary">
            {trainingDays} training days
          </MetricPill>
          <MetricPill icon={CheckCircle2} tone="emerald">
            {completedDays} completed
          </MetricPill>
          <MetricPill icon={Clock3}>
            {Math.round(weeklyProgress)}% weekly progress
          </MetricPill>
        </div>

        {(!hasPlan || !nextWorkout) && (
          <SurfaceCard tone="emerald" className="p-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-emerald-400/20 bg-emerald-500/14">
                  <Flame className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-eyebrow">Recovery Block</p>
                  <h2 className="text-xl font-semibold tracking-[-0.03em]">No workout scheduled today</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {hasPlan
                      ? "Weekend recovery. Your split resumes on Monday."
                      : "Build your plan to start tracking sessions."}
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setLocation("/plan")}>
                View Plan
              </Button>
            </div>
          </SurfaceCard>
        )}

        {hasPlan && nextWorkout && heroVisual && (
          <SurfaceCard tone={heroVisual.tone} className="p-5">
            <div className={cn("absolute inset-x-0 top-0 h-28 bg-linear-to-br", heroVisual.gradientClassName)} />
            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-background/50">
                      {HeroIcon ? (
                        <HeroIcon className={cn("h-4.5 w-4.5", heroVisual.accentClassName)} />
                      ) : null}
                    </div>
                    <MetricPill tone={heroVisual.tone}>{getWorkoutTypeLabel(nextWorkout.dayType, nextWorkout.type)}</MetricPill>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-eyebrow">Today's Workout</p>
                    <h2 className="text-[1.7rem] font-bold tracking-[-0.04em] leading-none text-balance">
                      {nextWorkout.title}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {isCardioDay
                        ? `${runDistance ? `${runDistance} ${unitLabel}` : "Cardio target"} programmed for today.`
                        : `${exerciseCount} movements lined up for the session.`}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-background/40 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Duration</div>
                  <div className="text-lg font-semibold">~{estimatedMinutes} min</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <MetricPill icon={Dumbbell} tone="default">
                  {isCardioDay ? "Cardio" : `${exerciseCount} exercises`}
                </MetricPill>
                <MetricPill icon={Clock3} tone="default">
                  ~{estimatedMinutes} min
                </MetricPill>
                {runDistance ? (
                  <MetricPill icon={Flame} tone="default">
                    {runDistance} {unitLabel}
                  </MetricPill>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!nextWorkout.completed ? (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setLocation(`/session/${nextWorkout.id}`)}
                  >
                    <Play className="h-5 w-5" />
                    Start Workout
                  </Button>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    Workout Completed
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setLocation("/plan")}
                >
                  <Calendar className="h-4 w-4" />
                  View Plan
                </Button>
              </div>

              {!nextWorkout.completed ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[1.2rem] border border-border/55 bg-background/42 px-4 py-3 text-left transition-colors hover:border-primary/20 hover:bg-background/56"
                  onClick={() => setLocation("/history")}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Progress Check
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review completed sessions and strength trends.
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-[1.2rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-left"
                  onClick={() => setLocation("/history")}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      Nice Work
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Session logged. Check the latest progress snapshot.
                    </p>
                  </div>
                  <Trophy className="h-4 w-4 text-emerald-300" />
                </button>
              )}
            </div>
          </SurfaceCard>
        )}

        <button type="button" className="w-full text-left" onClick={() => setLocation("/weekly")} disabled={!hasPlan}>
          <SurfaceCard tone="primary" className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-eyebrow">Weekly Volume</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Keep the week moving</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {weeklyStats.completedSets} of {weeklyStats.plannedSets} sets completed across the current split.
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-primary/20 bg-background/40 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Progress</div>
                  <div className="text-lg font-semibold">{Math.round(weeklyProgress)}%</div>
                </div>
              </div>

              <Progress value={weeklyProgress} className="h-2.5 bg-primary/12" />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tap for the detailed day-by-day breakdown</span>
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </SurfaceCard>
        </button>

        {hasPlan && (
          <div className="space-y-4">
            <SectionHeading
              icon={Calendar}
              title="This Week"
              description="A compact view of the split so you can jump into any day quickly."
            />
            <div className="space-y-3">
              {currentPlan.slice(0, 5).map((day) => (
                <button
                  type="button"
                  key={day.id} 
                  className={cn(
                    "w-full rounded-[1.35rem] border p-3 text-left transition-all",
                    day.completed
                      ? "border-primary/20 bg-primary/10"
                      : "border-border/60 bg-card/65 hover:border-primary/20 hover:bg-card/80",
                    day.id === nextWorkout?.id && "ring-1 ring-primary/25"
                  )}
                  onClick={() => setLocation(`/session/${day.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border text-sm font-bold",
                      day.completed
                        ? "border-primary/25 bg-primary text-primary-foreground"
                        : "border-border/60 bg-background/50 text-muted-foreground"
                    )}>
                      {day.dayNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold">{day.title}</h4>
                        {day.id === nextWorkout?.id ? (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Up next
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {day.completed ? "Completed" : getWorkoutTypeLabel(day.dayType, day.type)}
                      </p>
                    </div>
                    {day.completed ? (
                      <Trophy className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
