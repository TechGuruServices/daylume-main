import { MonitorForm } from "@/components/monitor-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteMonitor, useMonitors } from "@/hooks/use-monitors";
import { useToast } from "@/hooks/use-toast";
import { type MonitorResponse } from "@shared/schema";
import { format } from "date-fns";
import { Edit2, Plus, RadioReceiver, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";

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
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-gradient-sapphire animate-gradient-flow bg-300%">
            Active Monitors
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Manage your Craigslist RSS feeds to scrape for free stuff.</p>
        </div>

        <Button
          onClick={handleCreate}
          className="glass-card-premium text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] rounded-xl px-7 py-6 h-auto hover-lift active-press transition-all duration-300 z-10 animate-gradient-flow"
        >
          <Plus className="w-5 h-5 mr-2" />
          <span className="font-bold text-base tracking-wide">Add Monitor</span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-white/10 glass-ultra shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-display font-bold text-gradient-sapphire">
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
            <Card key={i} className="p-6 glass-card-premium border-white/5 animate-pulse">
              <div className="flex gap-5 items-center">
                <Skeleton className="w-14 h-14 rounded-full glass-card-subtle" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-7 w-1/4 rounded-lg glass-card-subtle" />
                  <Skeleton className="h-5 w-1/2 rounded-md glass-card-subtle" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : monitors?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center glass-panel rounded-[2rem]">
          <div className="glass-card-premium p-7 rounded-full mb-8 text-primary shadow-[0_0_40px_hsl(var(--primary)/0.15)] ring-1 ring-primary/20 hover-lift">
            <RadioReceiver className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-gradient-sapphire">No monitors yet</h2>
          <p className="text-muted-foreground text-lg max-w-md mb-10 font-medium">
            Create your first monitor by providing a Craigslist RSS search URL. We'll automatically fetch new items as they appear.
          </p>
          <Button
            onClick={handleCreate}
            size="lg"
            className="glass-card-premium text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] rounded-xl px-8 py-6 h-auto hover-lift active-press transition-all duration-300 animate-gradient-flow"
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
              className={`p-7 transition-all duration-500 hover-lift relative overflow-hidden group ${
                monitor.active
                  ? "glass-card-premium border-l-4 border-l-primary hover:border-l-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]"
                  : "glass-card-subtle border-l-4 border-l-muted-foreground/30 opacity-70 hover:opacity-100"
              }`}
            >
              {monitor.active && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/15 transition-colors duration-500" />
              )}

              <div className="flex items-start justify-between gap-5 relative z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-2xl font-bold font-display text-foreground truncate group-hover:text-gradient-primary transition-colors">
                      {monitor.name}
                    </h3>
                    <Badge variant={monitor.active ? "default" : "secondary"} className={`uppercase tracking-widest text-[10px] ${monitor.active ? "glass-card-subtle text-gradient-primary border border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.1)] px-3 py-1 animate-shimmer" : "px-3 py-1 glass-card-subtle text-muted-foreground"}`}>
                      {monitor.active ? "Active" : "Paused"}
                    </Badge>
                  </div>

                  <p className="text-sm text-foreground/70 font-mono truncate glass-card-subtle p-3 rounded-lg border border-white/5 mb-6 inline-block max-w-full shadow-inner">
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
                    className="glass-card-subtle hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors border-white/10 shadow-sm rounded-lg hover-lift active-press"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(monitor.id)}
                    className="glass-card-subtle hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors border-white/10 shadow-sm rounded-lg hover-lift active-press"
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
