import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

  const muscleGroupMap: Record<string, string> = {
    "Push Day": "Chest • Triceps • Shoulders",
    "Pull Day": "Back • Biceps • Rear Delts",
    "Leg Day": "Quads • Glutes • Hamstrings",
    "Shoulders & Abs": "Shoulders • Core",
    "Full Body Metabolic": "Full Body • Conditioning",
    "Active Recovery Run": "Cardio • Aerobic",
    "Long Run / Rest": "Cardio • Recovery",
  };
  const getFocusLabel = (title: string, type: string) => {
    if (type !== "lift") return "Aerobic Focus";
    const normalized = title.toLowerCase();
    if (normalized.includes("push")) return "Upper Push";
    if (normalized.includes("pull")) return "Upper Pull";
    if (normalized.includes("leg")) return "Lower Body";
    if (normalized.includes("shoulder")) return "Upper + Core";
    if (normalized.includes("full body")) return "Full Body";
    return "Strength Focus";
  };

  const estimatedMinutes = nextWorkout ? estimateDayMinutes(nextWorkout) : 0;
  const durationMin = Math.max(30, Math.round(estimatedMinutes * 0.9));
  const durationMax = Math.max(durationMin + 10, Math.round(estimatedMinutes * 1.2));

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hello, {profile.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMM do")}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 ring-1 ring-primary/30 flex items-center justify-center text-primary font-bold shadow-sm">
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
              <Button className="w-full h-12" onClick={() => setLocation("/plan")}>
                Go to Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {hasPlan && nextWorkout && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-card via-card to-primary/10 shadow-xl rounded-2xl">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
              <CardHeader className="relative pb-3 space-y-3">
                <div className="flex justify-between items-center">
                  <Badge
                    variant={nextWorkout.type === 'recovery' ? 'secondary' : 'default'}
                    className="uppercase text-[10px] tracking-widest"
                  >
                    Day {nextWorkout.dayNumber} • {nextWorkout.type}
                  </Badge>
                  {nextWorkout.completed && (
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Done
                    </Badge>
                  )}
                </div>
                <div>
                  <CardTitle className="text-3xl font-black uppercase tracking-tight">{nextWorkout.title}</CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{muscleGroupMap[nextWorkout.title] || "Full Body"}</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-[10px]">Intermediate</Badge>
                  </div>
                </div>
                <CardDescription className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{nextWorkout.exercises.length} exercises</span>
                  <span>•</span>
                  <span>{getFocusLabel(nextWorkout.title, nextWorkout.type)}</span>
                  <span>•</span>
                  <span>~{durationMin}-{durationMax} min</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-2">
                {!nextWorkout.completed ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full h-12 font-semibold text-base shadow-lg"
                      onClick={() => setLocation(`/session/${nextWorkout.id}`)}
                    >
                      <Play className="mr-2 h-5 w-5 fill-current" /> Start Session
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      ~{durationMin}-{durationMax} min • {nextWorkout.exercises.length} exercises
                    </p>
                  </>
                ) : (
                  <Button variant="secondary" className="w-full h-12" disabled>
                    Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
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
              Schedule
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
