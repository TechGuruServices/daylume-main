import { useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Edit2,
  RadioReceiver,
  Clock,
  Link2,
  ChevronRight,
} from "lucide-react";
import { useMonitors, useDeleteMonitor } from "@/hooks/use-monitors";
import { Button } from "@/components/ui/button";
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
import { motion, AnimatePresence } from "framer-motion";

// ── Component ─────────────────────────────────────────────────────────────────

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
    if (confirm("Delete this monitor and all its items?")) {
      deleteMonitor(id, {
        onSuccess: () => {
          toast({ title: "Monitor deleted", description: "Monitor and items removed." });
        },
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gradient-animate">
            Monitors
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium leading-relaxed">
            Manage your Craigslist RSS feeds.
          </p>
        </div>

        <button
          id="btn-add-monitor"
          onClick={handleCreate}
          className="btn-primary w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Monitor
        </button>
      </motion.section>

      {/* ═══════════════════════════════════════════
          DIALOG (Create / Edit)
          ═══════════════════════════════════════════ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px] rounded-3xl border-white/[0.07] bg-[hsl(222_45%_6%_/_0.97)]
                     backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.7)]"
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-display font-bold text-gradient">
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

      {/* ═══════════════════════════════════════════
          MONITOR LIST
          ═══════════════════════════════════════════ */}
      {isLoading ? (
        /* ── Loading skeleton ── */
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl bg-white/[0.05]" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3 rounded-lg bg-white/[0.05]" />
                  <Skeleton className="h-3 w-2/3 rounded bg-white/[0.04]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : monitors?.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl"
        >
          <div className="bg-blue-500/10 p-6 rounded-full mb-6 animate-pulse-glow">
            <RadioReceiver className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">No monitors yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
            Create your first monitor from a Craigslist RSS search URL to start catching items.
          </p>
          <button
            onClick={handleCreate}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Create First Monitor
          </button>
        </motion.div>
      ) : (
        /* ── Monitor cards ── */
        <div className="space-y-3">
          <AnimatePresence>
            {monitors?.map((monitor, i) => (
              <motion.div
                key={monitor.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                transition={{ duration: 0.35, delay: i * 0.06, type: "spring", stiffness: 110 }}
              >
                <div
                  className={`glass-card rounded-2xl p-5 hover-lift relative overflow-hidden group
                    ${monitor.active ? "" : "opacity-50 hover:opacity-80"}`}
                >
                  {/* Ambient glow */}
                  {monitor.active && (
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] pointer-events-none
                                 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-500"
                      aria-hidden="true"
                    />
                  )}

                  {/* ── Top row: icon + name + status ── */}
                  <div className="flex items-start gap-3.5 relative z-10">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${monitor.active
                          ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10"
                          : "bg-white/[0.04]"
                        }`}
                    >
                      <RadioReceiver
                        className={`w-4 h-4 ${monitor.active ? "text-blue-400" : "text-slate-600"}`}
                        strokeWidth={2}
                      />
                    </div>

                    {/* Info block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground truncate group-hover:text-blue-400 transition-colors duration-200">
                          {monitor.name}
                        </h3>
                        <span className={monitor.active ? "badge-active" : "badge-paused"}>
                          {monitor.active ? "Active" : "Paused"}
                        </span>
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Link2 className="w-3 h-3 text-slate-600 shrink-0" />
                        <p className="text-xs text-slate-500 truncate font-mono">
                          {monitor.url}
                        </p>
                      </div>

                      {/* Last checked */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" strokeWidth={2} />
                        <span>
                          Last check: {monitor.lastChecked
                            ? format(new Date(monitor.lastChecked), "MMM d, h:mm a")
                            : "Never"}
                        </span>
                      </div>
                    </div>

                    {/* Action chevron (mobile-friendly) */}
                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors mt-1 shrink-0" />
                  </div>

                  {/* ── Action buttons ── */}
                  <div
                    className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.05]
                               relative z-10 group-hover:border-white/[0.08] transition-colors"
                  >
                    <button
                      onClick={() => handleEdit(monitor)}
                      className="btn-ghost flex-1 text-xs py-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(monitor.id)}
                      className="btn-danger flex-1 text-xs py-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
