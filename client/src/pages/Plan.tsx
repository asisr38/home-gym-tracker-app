import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

export default function Plan() {
  const { currentPlan } = useStore();

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Training Schedule</h1>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {currentPlan.map((day) => (
            <AccordionItem key={day.id} value={day.id} className="border rounded-lg bg-card px-2">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 w-full">
                  {day.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted" />
                  )}
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Day {day.dayNumber}: {day.title}</span>
                      <Badge variant="outline" className="text-[10px] h-5 capitalize">{day.type}</Badge>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 px-2">
                <div className="space-y-3 pl-8 border-l ml-2.5 border-dashed">
                  {day.exercises.length > 0 ? (
                    day.exercises.map((ex) => (
                      <div key={ex.id} className="text-sm">
                        <div className="font-medium">{ex.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {ex.sets.length} x {ex.sets[0].targetReps}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {day.runTarget?.description || "Rest & Recovery"}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MobileShell>
  );
}
