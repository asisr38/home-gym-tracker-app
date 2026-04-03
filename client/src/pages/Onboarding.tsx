import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStore, type Equipment, type SplitType } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { SPLIT_OPTIONS } from "@/lib/planBuilder";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  height: z.coerce.number().min(1, "Required"),
  weight: z.coerce.number().min(1, "Required"),
  units: z.enum(["imperial", "metric"]),
  goalType: z.enum(["strength", "hypertrophy", "endurance", "fat_loss", "balanced"]),
  splitType: z.enum(["upper_lower", "ppl", "ppl_6day", "full_body"]),
  equipment: z.array(z.enum(["bodyweight", "dumbbell", "barbell", "bench", "rack", "bands", "kettlebell"])),
  dailyRunTarget: z.coerce.number().min(0),
  nutritionTarget: z.string().optional(),
  startOfWeek: z.coerce.number().min(0).max(6),
});

type FormValues = z.infer<typeof profileSchema>;

const EQUIPMENT_OPTIONS: Array<{ value: Exclude<Equipment, "bodyweight">; label: string; icon: string }> = [
  { value: "dumbbell",   label: "Dumbbells",        icon: "🏋️" },
  { value: "barbell",    label: "Barbell",           icon: "⚡" },
  { value: "bench",      label: "Bench",             icon: "🛋️" },
  { value: "rack",       label: "Rack / Pull-up Bar",icon: "🔩" },
  { value: "bands",      label: "Resistance Bands",  icon: "🔄" },
  { value: "kettlebell", label: "Kettlebell",        icon: "🫙" },
];

const GOAL_OPTIONS = [
  { value: "strength",    label: "Strength",      description: "Heavier lifts, lower reps",  icon: "💪" },
  { value: "hypertrophy", label: "Muscle Gain",   description: "Volume for size",            icon: "🏗️" },
  { value: "fat_loss",    label: "Fat Loss",      description: "High rep, metabolic",        icon: "🔥" },
  { value: "endurance",   label: "Endurance",     description: "High reps, conditioning",   icon: "🏃" },
  { value: "balanced",    label: "Balanced",      description: "Mix of strength & size",    icon: "⚖️" },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < current ? "bg-primary w-6" : i === current ? "bg-primary w-8" : "bg-muted w-4"
          )} />
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const getUserData = useStore((s) => s.getUserData);
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      units: "imperial",
      goalType: "balanced",
      splitType: "upper_lower",
      equipment: ["bodyweight", "dumbbell", "bench"],
      dailyRunTarget: 2,
      nutritionTarget: "",
      startOfWeek: 1,
    },
  });

  const { watch, setValue, register, formState: { errors } } = form;
  const units = watch("units");
  const goalType = watch("goalType");
  const splitType = watch("splitType");
  const selectedEquipment = watch("equipment");

  const toggleEquipment = (value: Equipment) => {
    if (value === "bodyweight") return;
    const next = new Set<Equipment>(selectedEquipment);
    if (next.has(value)) next.delete(value); else next.add(value);
    setValue("equipment", Array.from(next));
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const validateStep = async () => {
    const fields: Record<number, (keyof FormValues)[]> = {
      0: ["name", "height", "weight"],
      1: ["goalType"],
      2: ["splitType"],
      3: [],
    };
    const result = await form.trigger(fields[step]);
    return result;
  };

  const handleNext = async () => {
    if (await validateStep()) next();
  };

  const onSubmit = async (data: FormValues) => {
    const equipment: Equipment[] = data.equipment.includes("bodyweight")
      ? data.equipment
      : ["bodyweight", ...data.equipment];
    completeOnboarding({
      ...data,
      equipment,
      goal: data.goalType,
      onboardingCompleted: true,
      nutritionTarget: data.nutritionTarget ?? "",
    });
    const payload = getUserData();
    apiRequest("POST", "/api/user-data", payload).catch(() => {});
    setLocation("/");
  };

  return (
    <div className="min-h-screen app-shell flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tighter text-primary">IronStride</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your training profile</p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={form.handleSubmit(onSubmit)}>

          {/* ── Step 0: Basics ── */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-semibold mb-4">About you</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} placeholder="Your name" className="bg-muted/50" autoFocus />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Unit System</Label>
                <RadioGroup
                  value={units}
                  onValueChange={(v) => setValue("units", v as "imperial" | "metric")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="imperial" id="imperial" />
                    <Label htmlFor="imperial" className="font-normal">Imperial (lbs / mi)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="metric" id="metric" />
                    <Label htmlFor="metric" className="font-normal">Metric (kg / km)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height ({units === "imperial" ? "in" : "cm"})</Label>
                  <Input id="height" type="number" {...register("height")} className="bg-muted/50" placeholder={units === "imperial" ? "70" : "178"} />
                  {errors.height && <p className="text-xs text-destructive">{errors.height.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight ({units === "imperial" ? "lbs" : "kg"})</Label>
                  <Input id="weight" type="number" {...register("weight")} className="bg-muted/50" placeholder={units === "imperial" ? "175" : "80"} />
                  {errors.weight && <p className="text-xs text-destructive">{errors.weight.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Goal + Equipment ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold">Your goal & equipment</h2>

              <div className="space-y-2">
                <Label>Primary Goal</Label>
                <div className="grid grid-cols-1 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("goalType", opt.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                        goalType === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/30 hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equipment Available</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 opacity-50">
                    <Checkbox checked disabled className="h-4 w-4" />
                    <span className="text-xs font-medium">Bodyweight (always)</span>
                  </div>
                  {EQUIPMENT_OPTIONS.map((opt) => {
                    const selected = selectedEquipment.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleEquipment(opt.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border/60 bg-muted/30 hover:border-primary/40"
                        )}
                      >
                        <Checkbox checked={selected} className="h-4 w-4 pointer-events-none" />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">Select what you have at home or at your gym.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Workout Split ── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-xl font-semibold">Choose your split</h2>
                <p className="text-sm text-muted-foreground mt-1">Your weekly workout structure. You can change this later.</p>
              </div>

              <div className="space-y-3">
                {SPLIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("splitType", opt.value as SplitType)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      splitType === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-muted/20 hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.frequency}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        splitType === opt.value ? "border-primary text-primary" : "border-border/60 text-muted-foreground"
                      )}>
                        {opt.bestFor}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{opt.description}</p>
                    <div className="flex gap-1 flex-wrap">
                      {opt.schedule.map((day, i) => (
                        <span
                          key={i}
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded",
                            day === "Rest"
                              ? "bg-muted text-muted-foreground"
                              : splitType === opt.value
                                ? "bg-primary/20 text-primary"
                                : "bg-muted/60 text-foreground/70"
                          )}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Preferences ── */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold">A few more details</h2>

              <div className="space-y-2">
                <Label>Start of Week</Label>
                <Select
                  onValueChange={(v) => setValue("startOfWeek", parseInt(v))}
                  defaultValue="1"
                >
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyRunTarget">
                  Daily Cardio Baseline ({units === "imperial" ? "miles" : "km"})
                </Label>
                <Input
                  id="dailyRunTarget"
                  type="number"
                  step="0.1"
                  {...register("dailyRunTarget")}
                  className="bg-muted/50"
                />
                <p className="text-[10px] text-muted-foreground">Target distance for active recovery days.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nutritionTarget">Nutrition Goal <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="nutritionTarget"
                  {...register("nutritionTarget")}
                  placeholder="e.g. 2500 cal, 180g protein"
                  className="bg-muted/50"
                />
              </div>

              {/* Summary card */}
              <Card className="border-border/40 bg-muted/20">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your plan</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Split</span>
                    <span className="font-medium">{SPLIT_OPTIONS.find((o) => o.value === splitType)?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Goal</span>
                    <span className="font-medium capitalize">{goalType.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Equipment</span>
                    <span className="font-medium">{selectedEquipment.length} items</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={back} className="flex-1">
                Back
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button type="button" onClick={handleNext} className="flex-1 h-12 text-base">
                Continue
              </Button>
            ) : (
              <Button type="submit" className="flex-1 h-12 text-base font-semibold">
                Start Training
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
