import { ReactNode } from "react";
import { Settings, Radar } from "lucide-react";
import { BottomNav } from "./bottom-nav";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Mobile-first app shell:
 *   ┌──────────────────────────┐
 *   │  Fixed Header (64px)     │
 *   ├──────────────────────────┤
 *   │  Scrollable content area │
 *   │  pt-16 pb-24             │
 *   ├──────────────────────────┤
 *   │  Fixed Bottom Nav (64px) │
 *   └──────────────────────────┘
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex flex-col min-h-screen min-h-dvh w-full bg-background overflow-hidden">

      {/* ── Ambient background art (fixed, non-interactive) ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse 80% 50% at 5%   0%,   rgba(59,130,246,0.14) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 50% at 95%  100%, rgba(139,92,246,0.12) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 35% at 50%  110%, rgba(59,130,246,0.06) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* ================================================================
          HEADER — fixed, glassmorphic
          ================================================================ */}
      <header
        id="app-header"
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-5
                   bg-[hsl(222_47%_4%_/_0.85)] backdrop-blur-2xl
                   border-b border-white/[0.06] shadow-[0_1px_12px_rgba(0,0,0,0.4)]"
      >
        {/* Brand mark */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[11px] flex items-center justify-center
                       bg-gradient-to-br from-blue-500 to-violet-600
                       shadow-[0_0_16px_rgba(59,130,246,0.45)]"
          >
            <Radar className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>

          <div>
            <h1
              className="text-[17px] leading-none font-display font-bold
                         bg-clip-text text-transparent
                         bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400
                         bg-[length:200%_auto]"
              style={{ animation: "gradient-shift 5s ease-in-out infinite" }}
            >
              Craigs-Catch
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-600 mt-0.5 leading-none">
              Premium Monitor
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          {/* Live status pill */}
          <div className="badge-live">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                style={{ animation: "ping-dot 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
              />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span>Live</span>
          </div>

          {/* Settings button */}
          <button
            id="btn-settings"
            aria-label="Settings"
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08]
                       flex items-center justify-center
                       hover:bg-white/[0.08] hover:border-white/15
                       transition-all duration-200 active:scale-95"
          >
            <Settings className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ================================================================
          MAIN CONTENT — scrollable, sits between header and bottom nav
          ================================================================ */}
      <main className="relative z-10 flex-1 overflow-auto pt-16 pb-24">
        <div className="max-w-2xl mx-auto px-4 py-6 min-h-full">
          {children}
        </div>
      </main>

      {/* ================================================================
          BOTTOM NAVIGATION
          ================================================================ */}
      <BottomNav />

    </div>
  );
}
