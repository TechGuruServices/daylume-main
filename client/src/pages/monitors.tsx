import { useState } from "react";
import { format } from "date-fns";
import { Plus, Settings2, Trash2, Edit2, PlayCircle, StopCircle, RadioReceiver } from "lucide-react";
import { useMonitors, useDeleteMonitor } from "@/hooks/use-monitors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MonitorForm } from "@/components/monitor-form";
import { type MonitorResponse } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Monitors() {
  const { data: monitors, isLoading } = useMonitors();
  const { mutate: deleteMonitor } = useDeleteMonitor();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<MonitorResponse | null>(null);

  const handleCreate = () => {
    setEditingMonitor(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (monitor: MonitorResponse) => {
    setEditingMonitor(monitor);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this monitor? All associated items will also be removed.")) {
      deleteMonitor(id, {
        onSuccess: () => {
          toast({ title: "Monitor deleted", description: "Monitor and its items have been removed." });
        }
      });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative">
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-glow bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-300% animate-gradient">
            Active Monitors
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Manage your Craigslist RSS feeds to scrape for free stuff.</p>
        </div>
        
        <Button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.4)] rounded-xl px-7 py-6 h-auto hover:-translate-y-1 transition-all duration-300 z-10"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-bold text-base tracking-wide">Add Monitor</span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-white/10 bg-background/95 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-display font-bold text-glow">
              {editingMonitor ? "Edit Monitor" : "Create Monitor"}
            </DialogTitle>
          </DialogHeader>
          <MonitorForm 
            initialData={editingMonitor || undefined} 
            onSuccess={() => setIsDialogOpen(false)} 
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6 glass-card border-white/5 animate-pulse">
              <div className="flex gap-5 items-center">
                <Skeleton className="w-14 h-14 rounded-full bg-muted/50" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-7 w-1/4 rounded-lg bg-muted/50" />
                  <Skeleton className="h-5 w-1/2 rounded-md bg-muted/50" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : monitors?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center glass-panel rounded-[2rem]">
          <div className="bg-primary/10 p-7 rounded-full mb-8 text-primary shadow-[0_0_40px_rgba(20,184,166,0.15)] ring-1 ring-primary/20">
            <RadioReceiver className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-glow">No monitors yet</h2>
          <p className="text-muted-foreground text-lg max-w-md mb-10 font-medium">
            Create your first monitor by providing a Craigslist RSS search URL. We'll automatically fetch new items as they appear.
          </p>
          <Button 
            onClick={handleCreate}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.4)] rounded-xl px-8 py-6 h-auto hover:-translate-y-1 transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-3" />
            <span className="font-bold text-lg tracking-wide">Create First Monitor</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {monitors?.map((monitor) => (
            <Card 
              key={monitor.id} 
              className={`p-7 transition-all duration-500 hover:shadow-2xl relative overflow-hidden group ${
                monitor.active 
                  ? "glass-card hover-elevate border-l-4 border-l-primary hover:border-l-primary" 
                  : "bg-background/40 border-l-4 border-l-muted-foreground/30 opacity-70 hover:opacity-100"
              }`}
            >
              {monitor.active && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/15 transition-colors duration-500" />
              )}
              
              <div className="flex items-start justify-between gap-5 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-2xl font-bold font-display text-foreground truncate group-hover:text-primary transition-colors">
                      {monitor.name}
                    </h3>
                    <Badge variant={monitor.active ? "default" : "secondary"} className={`uppercase tracking-widest text-[10px] ${monitor.active ? "bg-primary/15 text-primary hover:bg-primary/30 border border-primary/20 shadow-[0_0_10px_rgba(20,184,166,0.1)] px-3 py-1" : "px-3 py-1 bg-muted text-muted-foreground"}`}>
                      {monitor.active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-foreground/70 font-mono truncate bg-background/50 backdrop-blur-sm p-3 rounded-lg border border-white/5 mb-6 inline-block max-w-full shadow-inner">
                    {monitor.url}
                  </p>
                  
                  <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-semibold tracking-wide">
                    <Settings2 className="w-4 h-4 text-primary/70" />
                    <span>
                      LAST CHECK: {monitor.lastChecked 
                        ? format(new Date(monitor.lastChecked), "MMM d, yyyy h:mm a") 
                        : "NEVER"}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(monitor)}
                    className="hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors border-white/10 shadow-sm rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(monitor.id)}
                    className="hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors border-white/10 shadow-sm rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
