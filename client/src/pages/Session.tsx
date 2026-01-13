import { useParams, useLocation } from "wouter";
import { useStore, ExerciseSet } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, Play, Timer, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function Session() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { currentPlan, logSet, completeWorkout, profile } = useStore();
  const { toast } = useToast();
  
  const day = currentPlan.find(d => d.id === id);
  const [activeTab, setActiveTab] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [runDistance, setRunDistance] = useState("");
  const [runTime, setRunTime] = useState("");
  const [calvesStretched, setCalvesStretched] = useState(false);

  useEffect(() => {
    if (day && day.exercises.length > 0) {
      setActiveTab(day.exercises[0].id);
    }
  }, [day]);

  if (!day) return <div>Workout not found</div>;

  const handleSetUpdate = (exerciseId: string, setId: string, field: keyof ExerciseSet, value: any) => {
    logSet(day.id, exerciseId, setId, { [field]: value });
  };

  const handleFinish = () => {
    const runData = day.type !== 'lift' || day.runTarget ? {
      distance: parseFloat(runDistance) || 0,
      timeSeconds: parseFloat(runTime) * 60 || 0
    } : undefined;

    completeWorkout(day.id, notes, runData, calvesStretched);
    toast({
      title: "Workout Completed!",
      description: "Great job. Rest up and hydrate.",
    });
    setLocation("/");
  };

  const isRunDay = day.type === 'run' || day.type === 'recovery';
  const isLegDay = day.title.toLowerCase().includes('leg');
  const hintText = (() => {
    const title = day.title.toLowerCase();
    if (day.type === "run") return "Easy pace. Breathe through the nose.";
    if (day.type === "recovery") return "Light effort. Keep it restorative.";
    if (title.includes("push")) return "Control the tempo. Full range.";
    if (title.includes("pull")) return "Squeeze the back. No momentum.";
    if (title.includes("leg")) return "Drive through heels. Stay tight.";
    if (title.includes("shoulder")) return "Brace core. Smooth reps.";
    if (title.includes("full body")) return "Keep rest short. Stay crisp.";
    return "Quality reps. Leave 1-2 in reserve.";
  })();
  const exerciseHintMap: Record<string, string> = {
    "DB Flat Bench Press": "Tuck elbows. Press straight up.",
    "Incline DB Press": "Chest up. Control the descent.",
    "Barbell Floor Press": "Pause on triceps. Drive hard.",
    "EZ Skullcrushers": "Elbows fixed. Smooth arc.",
    "Bench Dips": "Shoulders down. Full lockout.",
    "Barbell RDL": "Hinge hips. Keep back flat.",
    "Goblet Squats": "Chest tall. Knees track toes.",
    "Walking Lunges": "Soft steps. Stay balanced.",
    "Weighted Calf Raises": "Full stretch. Slow squeeze.",
    "Barbell Bent-Over Row": "Brace core. Row to waist.",
    "Single-Arm DB Row": "Pull elbow back. Pause.",
    "EZ Bar Curls": "No swing. Full extension.",
    "Reverse Grip Curls": "Wrists neutral. Slow reps.",
    "DB Pullovers": "Ribs down. Long arc.",
    "Barbell Overhead Press": "Glutes tight. Head through.",
    "DB Lateral Raises": "Lead with elbows. Soft bend.",
    "EZ Upright Rows": "Stop mid-chest. Elbows high.",
    "Russian Twists": "Rotate ribs. Breathe steady.",
    "Lying Leg Raises": "Lower slow. No arching.",
    "DB Thrusters": "Drive legs. Smooth press.",
    "Barbell Floor Wipers": "Controlled sweep. Brace core.",
    "Renegade Rows": "Feet wide. Hips stable.",
    "Decline Pushups": "Body straight. Full range.",
    "Plank": "Ribs down. Hold steady.",
  };

  return (
    <div className="min-h-screen app-shell flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background app-panel shadow-2xl ring-1 ring-black/5 dark:ring-white/10 border border-border/60 sm:rounded-[28px] pb-24">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h2 className="font-bold text-sm uppercase tracking-wider">{day.title}</h2>
            <p className="text-xs text-muted-foreground">Day {day.dayNumber}</p>
          </div>
          <Button size="sm" onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white">
            Finish
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {hintText}
          </div>
        
        {/* Lift Section */}
        {day.type === 'lift' && (
          <div className="space-y-4">
             {/* Exercise Navigation */}
            <div className="overflow-x-auto pb-2 no-scrollbar">
              <div className="flex gap-2">
                {day.exercises.map((ex, idx) => (
                  <button
                    key={ex.id}
                    onClick={() => setActiveTab(ex.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border",
                      activeTab === ex.id 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-card text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {idx + 1}. {ex.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Exercise Card */}
            {day.exercises.map((ex) => (
              <div key={ex.id} className={cn(activeTab === ex.id ? "block" : "hidden")}>
                <Card className="border-0 shadow-lg bg-card">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-black uppercase leading-none">{ex.name}</h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {exerciseHintMap[ex.name] || "Focus on form. Controlled tempo."}
                        </p>
                      </div>
                      {/* Placeholder for video/info */}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground mb-2 text-center">
                        <div className="col-span-1">#</div>
                        <div className="col-span-2 sm:col-span-3">WEIGHT ({profile.units === 'imperial' ? 'lbs' : 'kg'})</div>
                        <div className="col-span-2 sm:col-span-3">REPS ({ex.sets[0].targetReps})</div>
                        <div className="col-span-1">✓</div>
                        <div className="col-span-2">★ Form</div>
                      </div>

                      {ex.sets.map((set, idx) => (
                        <div key={set.id} className={cn(
                          "grid grid-cols-8 sm:grid-cols-10 gap-2 items-center p-2 rounded-lg transition-colors",
                          set.completed ? "bg-primary/10" : "bg-muted/30"
                        )}>
                          <div className="col-span-1 text-center font-bold text-sm text-muted-foreground">{idx + 1}</div>
                          
                          <div className="col-span-2 sm:col-span-3">
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="text-center h-9 sm:h-10 font-mono text-base sm:text-lg bg-background"
                              value={set.weight ?? ''}
                              onChange={(e) => handleSetUpdate(
                                ex.id,
                                set.id,
                                'weight',
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )}
                            />
                          </div>
                          
                          <div className="col-span-2 sm:col-span-3">
                            <Input 
                              type="number" 
                              placeholder={set.targetReps}
                              className="text-center h-9 sm:h-10 font-mono text-base sm:text-lg bg-background"
                              value={set.actualReps ?? ''}
                              onChange={(e) => handleSetUpdate(
                                ex.id,
                                set.id,
                                'actualReps',
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )}
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <Checkbox 
                              checked={set.completed}
                              onCheckedChange={(checked) => handleSetUpdate(ex.id, set.id, 'completed', !!checked)}
                              className="h-6 w-6"
                            />
                          </div>

                          <div className="col-span-2 flex justify-center">
                            <Checkbox 
                                checked={set.perfectForm}
                                onCheckedChange={(checked) => handleSetUpdate(ex.id, set.id, 'perfectForm', !!checked)}
                                className="h-6 w-6 border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                              />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Run / Cardio Section */}
        {(isRunDay || day.runTarget) && (
           <Card className="border-l-4 border-l-blue-500">
             <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Run Tracker</h3>
                    <p className="text-sm text-muted-foreground">{day.runTarget?.description || 'Daily active recovery run'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Distance ({profile.units === 'imperial' ? 'mi' : 'km'})</label>
                    <Input 
                      type="number" 
                      placeholder={day.runTarget?.distance.toString() || profile.dailyRunTarget.toString()}
                      value={runDistance}
                      onChange={(e) => setRunDistance(e.target.value)}
                      className="text-lg font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Time (min)</label>
                    <Input 
                      type="number" 
                      placeholder="30"
                      value={runTime}
                      onChange={(e) => setRunTime(e.target.value)}
                      className="text-lg font-mono"
                    />
                  </div>
                </div>
             </CardContent>
           </Card>
        )}

        {/* Leg Day Extras */}
        {isLegDay && (
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <span className="font-medium text-yellow-600 dark:text-yellow-400">Did you stretch calves after run?</span>
              <Checkbox 
                checked={calvesStretched}
                onCheckedChange={(c) => setCalvesStretched(!!c)}
                className="h-6 w-6 border-yellow-500"
              />
            </CardContent>
          </Card>
        )}

        {/* Session Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Session Notes</label>
          <Textarea 
            placeholder="How did it feel? Any pain? RPE?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        </div>
      </div>
    </div>
  );
}
