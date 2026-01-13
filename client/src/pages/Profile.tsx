import { useStore } from "@/lib/store";
import { MobileShell } from "@/components/layout/MobileShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { profile, exportData, importData, resetPlan } = useStore();
  const { toast } = useToast();

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironstride-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importData(event.target?.result as string);
      if (success) {
        toast({ title: "Import Successful", description: "Your history has been restored." });
      } else {
        toast({ title: "Import Failed", description: "Invalid file format.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will reset your current week's progress.")) {
      resetPlan();
      toast({ title: "Week Reset", description: "The plan has been reset to Day 1." });
    }
  };

  return (
    <MobileShell>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Profile & Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-mono text-lg">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-mono text-lg">{profile.weight} {profile.units === 'imperial' ? 'lbs' : 'kg'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="font-medium">{profile.goal}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Nutrition</p>
                <p className="font-mono text-sm bg-muted p-2 rounded">{profile.nutritionTarget || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export Data (JSON)
            </Button>
            
            <div className="relative">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" /> Import Data
              </Button>
              <Input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleImport}
                accept=".json"
              />
            </div>

            <Separator />

            <Button variant="destructive" className="w-full justify-start" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Current Week
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          v1.0.0 • Offline First
        </div>
      </div>
    </MobileShell>
  );
}
