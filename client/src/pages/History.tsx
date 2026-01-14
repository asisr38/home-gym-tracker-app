import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from "@/lib/utils";

export default function History() {
  const { history, profile } = useStore();

  // Prepare chart data (Last 7 sessions volume)
  // Simplification: Sum of reps for lifting, or just 1 for completion
  const chartData = history.slice(-7).map((day, i) => ({
    name: `D${day.dayNumber}`,
    // Simple metric: Number of sets completed
    volume: day.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0),
    type: day.type
  }));

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">History & Progress</h1>
          <p className="text-xs text-muted-foreground">Showing the last 30 days of sessions.</p>
        </div>

        {history.length > 0 ? (
          <>
             {/* Volume Chart */}
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sets Completed (Last 7 Sessions)</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.type === 'lift' ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Log List */}
            <div className="space-y-4">
              <h3 className="font-semibold">Recent Logs</h3>
              {[...history].reverse().map((day) => (
                <Card key={day.dateCompleted + day.id} className="overflow-hidden border-border/60 shadow-sm">
                  <div className="flex">
                    <div className={cn("w-2", day.type === 'lift' ? "bg-primary" : "bg-green-500")} />
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{day.title}</h4>
                          <p className="text-xs text-muted-foreground">{format(new Date(day.dateCompleted!), "MMM d, yyyy • h:mm a")}</p>
                        </div>
                        {day.runActual && (
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold">{day.runActual.distance} {profile.units === 'imperial' ? 'mi' : 'km'}</div>
                            <div className="text-xs text-muted-foreground">{Math.round(day.runActual.timeSeconds / 60)} min</div>
                          </div>
                        )}
                      </div>
                      
                      {day.notes && (
                        <div className="mt-3 text-sm bg-muted/50 p-2 rounded italic text-muted-foreground">
                          "{day.notes}"
                        </div>
                      )}

                      {day.calvesStretched && (
                         <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                           <span>✓ Calves Stretched</span>
                         </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No sessions logged yet.</p>
            <p className="text-sm">Start a session from the Home screen.</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
