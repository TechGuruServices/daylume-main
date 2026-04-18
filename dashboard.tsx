import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  Trash2,
  Tag,
  PackageSearch,
  Zap,
  Filter,
  Send,
  Clock,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useItems, useDeleteItem } from "./client/src/hooks/use-items";
import { useMonitors } from "./client/src/hooks/use-monitors";
import { Button } from "./client/src/components/ui/button";
import { Skeleton } from "./client/src/components/ui/skeleton";
import { useToast } from "./client/src/hooks/use-toast";
import type { Item, Monitor } from "./shared/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip HTML tags and return plain text */
function stripHtml(html: string) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// ── Stats Card ────────────────────────────────────────────────────────────────

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string; // tailwind color token, e.g. "blue", "violet", "emerald"
  delay?: number;
}

function StatCard({ icon, label, value, accent = "blue", delay = 0 }: StatProps) {
  const accentMap: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5  text-blue-400  shadow-blue-500/25",
    violet: "from-violet-500/20 to-violet-600/5 text-violet-400 shadow-violet-500/25",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 shadow-emerald-500/25",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400 shadow-amber-500/25",
  };
  const colors = accentMap[accent] ?? accentMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, type: "spring", stiffness: 120 }}
      className="stat-card"
    >
      {/* Icon badge */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.split(" ").slice(0, 2).join(" ")} flex items-center justify-center`}>
        {icon}
      </div>

      {/* Value */}
      <p className="text-2xl font-display font-extrabold tracking-tight text-foreground">{value}</p>

      {/* Label */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: monitors } = useMonitors();
  const { mutate: deleteItem } = useDeleteItem();
  const { toast } = useToast();

  const [filterMonitor, setFilterMonitor] = useState<number | "all">("all");

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteItem(id, {
      onSuccess: () => {
        toast({ title: "Item removed", description: "Cleared from your dashboard." });
      },
    });
  };

  const filteredItems =
    items?.filter((item: Item) => (filterMonitor === "all" ? true : item.monitorId === filterMonitor)) ?? [];

  const activeMonitors = monitors?.filter((m: Monitor) => m.active).length ?? 0;
  const todayCount =
    items?.filter((i: Item) => {
      const d = new Date(i.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length ?? 0;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════
          SECTION 1  —  Welcome / Hero
          ═══════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gradient-animate">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm font-medium leading-relaxed">
          Real-time overview of your Craigslist monitoring feeds.
        </p>
      </motion.section>

      {/* ═══════════════════════════════════════════
          SECTION 2  —  Stats Grid
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={<Zap className="w-4 h-4 text-blue-400" strokeWidth={2.5} />}
          label="Caught Today"
          value={todayCount}
          accent="blue"
          delay={0}
        />
        <StatCard
          icon={<Filter className="w-4 h-4 text-violet-400" strokeWidth={2.5} />}
          label="Active Filters"
          value={activeMonitors}
          accent="violet"
          delay={0.07}
        />
        <StatCard
          icon={<Send className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />}
          label="Telegram"
          value="Connected"
          accent="emerald"
          delay={0.14}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-amber-400" strokeWidth={2.5} />}
          label="Total Items"
          value={items?.length ?? 0}
          accent="amber"
          delay={0.21}
        />
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 3  —  Filter Tabs
          ═══════════════════════════════════════════ */}
      {monitors && monitors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex flex-wrap gap-2"
        >
          <button
            onClick={() => setFilterMonitor("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
              filterMonitor === "all"
                ? "bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                : "bg-white/[0.03] text-muted-foreground border-white/[0.07] hover:bg-white/[0.06] hover:text-foreground"
            }`}
          >
            All Items
          </button>
          {monitors.map((m: Monitor) => (
            <button
              key={m.id}
              onClick={() => setFilterMonitor(m.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                filterMonitor === m.id
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                  : "bg-white/[0.03] text-muted-foreground border-white/[0.07] hover:bg-white/[0.06] hover:text-foreground"
              }`}
            >
              {m.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* Heading for live feed */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold tracking-tight text-foreground">
          Live Feed
        </h2>
        {!itemsLoading && (
          <span className="text-xs text-muted-foreground font-medium">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4  —  Live Feed Cards
          ═══════════════════════════════════════════ */}
      {itemsLoading ? (
        /* ── Loading skeleton ── */
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse space-y-3">
              <Skeleton className="h-5 w-3/5 rounded-lg bg-white/[0.05]" />
              <Skeleton className="h-3 w-full rounded bg-white/[0.04]" />
              <Skeleton className="h-3 w-2/3 rounded bg-white/[0.04]" />
              <div className="flex justify-between pt-3 border-t border-white/[0.04]">
                <Skeleton className="h-4 w-20 rounded bg-white/[0.04]" />
                <Skeleton className="h-7 w-7 rounded-lg bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* ── Empty state ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl"
        >
          <div className="bg-blue-500/10 p-6 rounded-full mb-6 animate-pulse-glow">
            <PackageSearch className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">No items yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            We haven't found any matches. Make sure your monitors are active and try a manual sync.
          </p>
        </motion.div>
      ) : (
        /* ── Feed list ── */
        <div className="space-y-3">
          <AnimatePresence>
            {filteredItems.map((item: Item, i: number) => {
              const monitor = monitors?.find((m: Monitor) => m.id === item.monitorId);
              const descText = item.description
                ? stripHtml(item.description).slice(0, 120) + "…"
                : "No description available.";
              const postedDate = item.postedAt ? new Date(item.postedAt) : new Date(item.createdAt);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                  transition={{ duration: 0.35, delay: i * 0.04, type: "spring", stiffness: 110 }}
                >
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-2xl"
                  >
                    <div className="glass-card rounded-2xl p-5 hover-lift relative overflow-hidden">
                      {/* Ambient glow on hover */}
                      <div
                        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[50px] pointer-events-none
                                   bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors duration-500"
                        aria-hidden="true"
                      />

                      {/* Top row: tag + external link icon */}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="chip">
                          <Tag className="w-3 h-3" />
                          {monitor?.name ?? "Unknown"}
                        </span>

                        <ExternalLink
                          className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100
                                     transition-all duration-300 translate-x-1 group-hover:translate-x-0"
                        />
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2 mb-1.5
                                     group-hover:text-blue-400 transition-colors duration-200 relative z-10">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed mb-4 relative z-10">
                        {descText}
                      </p>

                      {/* Footer: time + delete */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]
                                      relative z-10 group-hover:border-white/[0.08] transition-colors">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" strokeWidth={2} />
                          <span className="font-medium">
                            {formatDistanceToNow(postedDate, { addSuffix: true })}
                          </span>
                          <span className="text-slate-700 mx-1">·</span>
                          <span className="text-[11px] text-slate-600">
                            {format(postedDate, "MMM d, h:mm a")}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 rounded-lg text-slate-600
                                     hover:text-red-400 hover:bg-red-500/10
                                     transition-colors duration-200 z-20"
                          onClick={(e: React.MouseEvent) => handleDelete(item.id, e)}
                          aria-label={`Delete item: ${item.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
