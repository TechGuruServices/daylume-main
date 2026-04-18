import { useState, ReactNode } from "react";
import { Settings, Radar, Bell, Shield, MonitorSmartphone } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
        className="pointer-events-none fixed inset-0 z-0 ambient-background-art"
        aria-hidden="true"
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
            className="w-10 h-10 rounded-[12px] flex items-center justify-center p-[2px]
                       bg-gradient-to-br from-blue-500/20 to-violet-600/20
                       shadow-[0_0_16px_rgba(59,130,246,0.25)] border border-white/[0.08]"
          >
            <img src="/favicon.png" alt="Craigs-Catch Logo" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>

          <div>
            <h1
              className="text-[17px] leading-none font-display font-bold
                         bg-clip-text text-transparent
                         bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400
                         bg-[length:200%_auto] animate-[gradient-shift_5s_ease-in-out_infinite]"
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
                className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-[ping-dot_1.4s_cubic-bezier(0,0,0.2,1)_infinite]"
              />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span>Live</span>
          </div>

          {/* Settings button */}
          <Dialog>
            <DialogTrigger asChild>
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
            </DialogTrigger>

            {/* Settings Dialog Modal */}
            <DialogContent className="sm:max-w-[400px] glass-panel border-white/[0.08] bg-[#0a0f1e]/95 text-foreground sm:rounded-[24px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-display font-bold">App Settings</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-6 py-4">

                {/* Configuration Group */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preferences</h4>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Bell className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <Label htmlFor="notifications" className="text-sm font-semibold cursor-pointer">Telegram Alerts</Label>
                        <p className="text-xs text-muted-foreground">Receive instant push notifications</p>
                      </div>
                    </div>
                    <Switch id="notifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <MonitorSmartphone className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <Label htmlFor="theme" className="text-sm font-semibold cursor-pointer">Dark Mode Luxury</Label>
                        <p className="text-xs text-muted-foreground">PWA optimized aesthetic</p>
                      </div>
                    </div>
                    <Switch id="theme" defaultChecked disabled />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[10px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Shield className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <Label htmlFor="stealth" className="text-sm font-semibold cursor-pointer">Stealth Scraping</Label>
                        <p className="text-xs text-muted-foreground">Low-profile request frequency</p>
                      </div>
                    </div>
                    <Switch id="stealth" />
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground">
                  <span>Craigs-Catch v1.0.0</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> System Online</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
