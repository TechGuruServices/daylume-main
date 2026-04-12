import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="relative flex min-h-screen w-full overflow-hidden">
        {/* Premium Background Layers */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(120,119,198,0.08),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_45%_45%,rgba(120,119,198,0.06),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),rgba(0,0,0,0.01))]" />

        <AppSidebar />

        <div className="flex flex-col flex-1 min-w-0 relative z-0">
          {/* Premium Header */}
          <header className="flex h-20 items-center justify-between px-8 border-b border-white/10 glass-ultra sticky top-0 z-50">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="hover-lift active-press w-12 h-12 glass-card-premium text-foreground/80 hover:text-primary transition-all rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center" />
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-gradient-sapphire animate-gradient-flow bg-200%">
                  CraigsCatch
                </h1>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70 font-medium">
                  Premium Scanner • Always Active
                </p>
              </div>
            </div>

            {/* Premium Status Indicator */}
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-3 glass-card-premium px-5 py-3 text-sm text-foreground/90 shadow-sm">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping opacity-75" />
                </div>
                <span className="font-medium text-gradient-primary">Live Feed Active</span>
              </div>
            </div>
          </header>

          {/* Premium Main Content */}
          <main className="relative flex-1 overflow-auto scrollbar-premium px-6 py-8 md:px-10 md:py-12">
            {/* Ambient Background Effects */}
            <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.04),transparent_70%)] pointer-events-none -z-10" />
            <div className="absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(circle_at_bottom,rgba(120,119,198,0.03),transparent_70%)] pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto h-full relative">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
