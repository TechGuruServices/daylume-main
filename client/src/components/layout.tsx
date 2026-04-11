import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
      <div className="flex h-screen w-full bg-background overflow-hidden relative">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 relative z-0">
          <header className="flex h-20 items-center justify-between px-8 border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-50">
            <div className="flex items-center gap-5">
              <SidebarTrigger className="hover-elevate active-elevate-2 w-10 h-10 bg-card border border-white/5 shadow-sm text-foreground/80 hover:text-primary transition-all rounded-xl" />
              <h1 className="text-2xl font-bold font-display tracking-tight text-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                CraigsCatch
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-transparent p-6 md:p-10 relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none -z-20" />
            
            {/* Ambient animated glowing orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[10000ms]" />
            <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[150px] pointer-events-none -z-10" />
            
            <div className="max-w-7xl mx-auto h-full relative z-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
