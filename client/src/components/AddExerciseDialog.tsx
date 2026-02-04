import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Exercise } from "@/lib/store";

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
    setSearch("");
    setCustomName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Exercise</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Library</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1">
                {filtered.map((ex) => (
                  <button
                    key={ex.name}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    onClick={() => handleAdd(ex.name, ex.category)}
                  >
                    <span>{ex.name}</span>
                    <span className="text-xs text-muted-foreground">{ex.category}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No exercises found.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
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
                  value={targetSets}
                  onChange={(e) => setTargetSets(parseInt(e.target.value))}
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
            <Button 
              className="w-full" 
              disabled={!customName.trim()}
              onClick={() => handleAdd(customName)}
            >
              Add Exercise
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
