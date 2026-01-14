import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

const equipmentOptions = [
  { value: "dumbbell", label: "Dumbbells" },
  { value: "barbell", label: "Barbell" },
  { value: "bench", label: "Bench" },
  { value: "rack", label: "Rack/Pullup Bar" },
  { value: "bands", label: "Resistance Bands" },
  { value: "kettlebell", label: "Kettlebell" },
];

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  height: z.coerce.number().min(1, "Height is required"),
  weight: z.coerce.number().min(1, "Weight is required"),
  goal: z.string().min(1, "Goal is required"),
  goalType: z.enum(["strength", "hypertrophy", "endurance", "fat_loss", "balanced"]),
  units: z.enum(["imperial", "metric"]),
  dailyRunTarget: z.coerce.number().min(0),
  nutritionTarget: z.string().optional(),
  startOfWeek: z.coerce.number().min(0).max(6),
  equipment: z.array(z.enum(["bodyweight", "dumbbell", "barbell", "bench", "rack", "bands", "kettlebell"])),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Onboarding() {
  const completeOnboarding = useStore(state => state.completeOnboarding);
  const getUserData = useStore(state => state.getUserData);
  const [, setLocation] = useLocation();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      goal: "Build Muscle & Endurance",
      goalType: "balanced",
      units: "imperial",
      dailyRunTarget: 2,
      nutritionTarget: "2500 cal / 180g protein",
      startOfWeek: 1,
      equipment: ["bodyweight", "dumbbell", "bench"],
    }
  });
  const selectedEquipment = form.watch("equipment");

  const onSubmit = async (data: ProfileFormValues) => {
    const equipment = data.equipment.includes("bodyweight")
      ? data.equipment
      : ["bodyweight", ...data.equipment];
    completeOnboarding({
      ...data,
      equipment,
      onboardingCompleted: true,
      nutritionTarget: data.nutritionTarget || ""
    });
    const payload = getUserData();
    apiRequest("POST", "/api/user-data", payload).catch(() => {
      // Best-effort sync; offline users can still proceed.
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen app-shell p-6 flex items-center justify-center">
      <Card className="w-full max-w-md border-border/60 shadow-2xl app-panel">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tighter text-primary">IronStride</CardTitle>
          <CardDescription>
            Configure your hybrid training profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="Your name" className="bg-muted/50" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height ({form.watch("units") === "imperial" ? "in" : "cm"})</Label>
                <Input id="height" type="number" {...form.register("height")} className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight ({form.watch("units") === "imperial" ? "lbs" : "kg"})</Label>
                <Input id="weight" type="number" {...form.register("weight")} className="bg-muted/50" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Unit System</Label>
              <RadioGroup 
                defaultValue="imperial" 
                onValueChange={(val) => form.setValue("units", val as "imperial" | "metric")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="imperial" id="imperial" />
                  <Label htmlFor="imperial">Imperial (lbs/mi)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="metric" id="metric" />
                  <Label htmlFor="metric">Metric (kg/km)</Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Start of Week</Label>
              <Select onValueChange={(val) => form.setValue("startOfWeek", parseInt(val))} defaultValue="1">
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select start day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyRunTarget">Daily Run Baseline (miles/km)</Label>
              <Input id="dailyRunTarget" type="number" step="0.1" {...form.register("dailyRunTarget")} className="bg-muted/50" />
              <p className="text-[10px] text-muted-foreground">Used for active recovery days.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nutritionTarget">Nutrition Goals</Label>
              <Input id="nutritionTarget" {...form.register("nutritionTarget")} placeholder="e.g. 2500 cal, 180g protein" className="bg-muted/50" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Primary Goal</Label>
              <Select onValueChange={(val) => form.setValue("goalType", val as ProfileFormValues["goalType"])} defaultValue="balanced">
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select goal focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="hypertrophy">Muscle Gain</SelectItem>
                  <SelectItem value="endurance">Endurance</SelectItem>
                  <SelectItem value="fat_loss">Fat Loss</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Goal Detail</Label>
              <Input id="goal" {...form.register("goal")} placeholder="e.g. Build muscle & endurance" className="bg-muted/50" />
            </div>

            <div className="space-y-3">
              <Label>Equipment Available</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Checkbox checked disabled className="h-4 w-4" />
                  Bodyweight (always)
                </label>
                {equipmentOptions.map((option) => {
                  const selected = selectedEquipment.includes(option.value as ProfileFormValues["equipment"][number]);
                  return (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs font-medium text-foreground"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedEquipment);
                          if (checked) {
                            next.add(option.value as ProfileFormValues["equipment"][number]);
                          } else {
                            next.delete(option.value as ProfileFormValues["equipment"][number]);
                          }
                          form.setValue("equipment", Array.from(next));
                        }}
                        className="h-4 w-4"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Used to tailor the plan to what you have at home.
              </p>
            </div>

            <Button type="submit" className="w-full text-lg h-12">Start Training</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
