import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Calendar, Trophy, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function Home() {
  const { profile, currentPlan, history } = useStore();
  const [, setLocation] = useLocation();

  // Determine "Today" based on startOfWeek
  // For simplicity in this mock, we'll just pick the first incomplete day or the day matching current day of week relative to start
  const todayIndex = (new Date().getDay() - profile.startOfWeek + 7) % 7;
  // const todayWorkout = currentPlan.find(d => d.dayNumber === todayIndex + 1) || currentPlan[0];
  
  // Actually, let's just find the next incomplete workout for "Continue" logic
  const nextWorkout = currentPlan.find(d => !d.completed) || currentPlan[0];
  
  // Calculate weekly progress
  const weeklyProgress = (currentPlan.filter(d => d.completed).length / 7) * 100;

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hello, {profile.name.split(' ')[0]}</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMM do")}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {profile.name.charAt(0)}
          </div>
        </div>

        {/* Hero Card: Today's Workout */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <Card className="relative border-0 bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center mb-1">
                <Badge variant={nextWorkout.type === 'recovery' ? 'secondary' : 'default'} className="uppercase text-[10px] tracking-widest">
                  Day {nextWorkout.dayNumber} • {nextWorkout.type}
                </Badge>
                {nextWorkout.completed && <Badge variant="outline" className="text-green-500 border-green-500">Done</Badge>}
              </div>
              <CardTitle className="text-3xl font-black italic uppercase tracking-tighter">{nextWorkout.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {nextWorkout.type === 'lift' 
                  ? `${nextWorkout.exercises.length} Exercises • Push/Pull Focus`
                  : `Target: ${nextWorkout.runTarget?.distance} ${profile.units === 'imperial' ? 'mi' : 'km'} Run`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!nextWorkout.completed ? (
                <Button 
                  size="lg" 
                  className="w-full font-bold text-md group-hover:bg-primary/90 transition-all"
                  onClick={() => setLocation(`/session/${nextWorkout.id}`)}
                >
                  <Play className="mr-2 h-5 w-5 fill-current" /> Start Session
                </Button>
              ) : (
                <Button variant="secondary" className="w-full" disabled>
                  Completed
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Weekly Volume</span>
            <span>{Math.round(weeklyProgress)}%</span>
          </div>
          <Progress value={weeklyProgress} className="h-2" />
        </div>

        {/* Upcoming Schedule Preview */}
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
                  "flex items-center p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                  day.completed ? "bg-muted/20 border-primary/20" : "bg-card border-border",
                  day.id === nextWorkout.id && "ring-1 ring-primary border-primary"
                )}
                onClick={() => setLocation(`/plan`)}
              >
                <div className={cn(
                  "h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm mr-4",
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
      </div>
    </MobileShell>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
