import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Exercise } from "@/lib/store";
import { SurfaceCard } from "@/components/ui/app-surfaces";

interface AddExerciseDialogProps {
  onAdd: (exercise: Exercise) => void;
  trigger?: React.ReactNode;
}

const PREDEFINED_EXERCISES = [
  // Push
  { name: "Pushups", category: "Push" },
  { name: "Bench Press", category: "Push" },
  { name: "Incline Bench Press", category: "Push" },
  { name: "Overhead Press", category: "Push" },
  { name: "Dips", category: "Push" },
  { name: "Tricep Ext", category: "Push" },
  { name: "Lateral Raises", category: "Push" },
  
  // Pull
  { name: "Pullups", category: "Pull" },
  { name: "Chin-ups", category: "Pull" },
  { name: "Barbell Row", category: "Pull" },
  { name: "Dumbbell Row", category: "Pull" },
  { name: "Lat Pulldown", category: "Pull" },
  { name: "Face Pulls", category: "Pull" },
  { name: "Bicep Curls", category: "Pull" },
  { name: "Hammer Curls", category: "Pull" },

  // Legs
  { name: "Squat", category: "Legs" },
  { name: "Front Squat", category: "Legs" },
  { name: "Deadlift", category: "Legs" },
  { name: "RDL", category: "Legs" },
  { name: "Lunges", category: "Legs" },
  { name: "Bulgarian Split Squat", category: "Legs" },
  { name: "Calf Raises", category: "Legs" },
  { name: "Leg Press", category: "Legs" },

  // Core
  { name: "Plank", category: "Core" },
  { name: "Crunches", category: "Core" },
  { name: "Leg Raises", category: "Core" },
  { name: "Russian Twists", category: "Core" },
];

const toExerciseId = (name: string) =>
  `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

export function AddExerciseDialog({ onAdd, trigger }: AddExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState("8-12");

  const filtered = PREDEFINED_EXERCISES.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setSearch("");
    setCustomName("");
    setTargetSets(3);
    setTargetReps("8-12");
  };

  const handleAdd = (name: string, muscleGroup?: string) => {
    const newExercise: Exercise = {
      id: toExerciseId(name),
      name,
      muscleGroup: muscleGroup || "Custom",
      sets: Array.from({ length: targetSets }, (_, i) => ({
        id: `s-${i + 1}`,
        targetReps,
        actualReps: null,
        weight: null,
        completed: false,
        perfectForm: false,
      })),
    };
    onAdd(newExercise);
    setOpen(false);
    resetForm();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Exercise</Button>}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex h-[85dvh] max-h-[85dvh] flex-col rounded-t-[28px] border-border/60 px-0 pb-0"
      >
        <SheetHeader className="px-4 pb-0">
          <SheetTitle>Add exercise</SheetTitle>
          <SheetDescription>
            Pick from the library or create a custom movement for this workout day.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="list" className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="px-4">
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="list" className="rounded-lg text-xs font-semibold">
                Library
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-lg text-xs font-semibold">
                Custom
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Exercise library
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {filtered.length} movement{filtered.length === 1 ? "" : "s"} available
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Search by movement name and tap to add it instantly.
                </div>
              </div>

              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <div className="space-y-2 pb-2">
                {filtered.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    className="w-full rounded-2xl border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    onClick={() => handleAdd(ex.name, ex.category)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{ex.name}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{ex.category}</div>
                      </div>
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                    No exercises found.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <SurfaceCard className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exercise Name</label>
                    <Input
                      placeholder="e.g. Burpees"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Sets</label>
                      <Input
                        type="number"
                        min={1}
                        value={targetSets}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10);
                          setTargetSets(Number.isFinite(next) && next > 0 ? next : 1);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Reps</label>
                      <Input
                        value={targetReps}
                        onChange={(e) => setTargetReps(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            <div className="border-t border-border/60 px-4 py-4">
              <Button
                className="w-full"
                disabled={!customName.trim()}
                onClick={() => handleAdd(customName)}
              >
                Add Exercise
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
