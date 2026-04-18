import { LayoutDashboard, RadioReceiver, MessageSquare, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTriggerCheck } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";

// ── Nav tab definition ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { title: "Dashboard", url: "/",         icon: LayoutDashboard },
  { title: "Monitors",  url: "/monitors", icon: RadioReceiver },
  { title: "AI Chat",   url: "/chat",     icon: MessageSquare },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export function BottomNav() {
  const [location] = useLocation();
  const { mutate: triggerCheck, isPending } = useTriggerCheck();
  const { toast } = useToast();

  const handleSync = () => {
    triggerCheck(undefined, {
      onSuccess: () =>
        toast({ title: "Sync complete ✓", description: "All active feeds have been checked." }),
      onError: (err: Error) =>
        toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <nav
      id="bottom-nav"
      className="glass-nav fixed bottom-0 left-0 right-0 z-50 pb-safe"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">

        {/* ── Standard nav tabs ── */}
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.url;
          return (
            <Link key={item.title} href={item.url}>
              <button
                id={`nav-tab-${item.title.toLowerCase().replace(" ", "-")}`}
                className="group flex flex-col items-center gap-1 px-4 py-1 relative"
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon container */}
                <div
                  className={`
                    relative p-2.5 rounded-2xl transition-all duration-300
                    ${isActive
                      ? "bg-blue-500/15 shadow-[0_0_16px_rgba(59,130,246,0.35)]"
                      : "group-hover:bg-white/[0.05]"
                    }
                  `}
                >
                  <item.icon
                    className={`
                      w-[18px] h-[18px] transition-all duration-300
                      ${isActive
                        ? "text-blue-400"
                        : "text-slate-500 group-hover:text-slate-300"
                      }
                    `}
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />

                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 block" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
                    isActive ? "text-blue-400" : "text-slate-600"
                  }`}
                >
                  {item.title}
                </span>
              </button>
            </Link>
          );
        })}

        {/* ── Force-Sync action tab ── */}
        <button
          id="nav-tab-sync"
          onClick={handleSync}
          disabled={isPending}
          className="group flex flex-col items-center gap-1 px-4 py-1"
          aria-label="Force sync feeds"
        >
          <div
            className={`
              p-2.5 rounded-2xl transition-all duration-300
              bg-gradient-to-br from-blue-500 to-violet-600
              shadow-[0_0_16px_rgba(59,130,246,0.35)]
              ${isPending ? "opacity-70" : "group-hover:shadow-[0_0_24px_rgba(59,130,246,0.55)] group-hover:-translate-y-0.5"}
              ${isPending ? "cursor-not-allowed" : "cursor-pointer active:translate-y-0"}
            `}
          >
            <RefreshCw
              className={`w-[18px] h-[18px] text-white ${isPending ? "animate-spin" : ""}`}
              strokeWidth={2.5}
            />
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-slate-600">
            {isPending ? "Syncing" : "Sync"}
          </span>
        </button>

      </div>
    </nav>
  );
}
