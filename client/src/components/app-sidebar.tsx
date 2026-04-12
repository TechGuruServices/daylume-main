import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTriggerCheck } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, MessageSquare, RadioReceiver, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";

export function AppSidebar() {
  const [location] = useLocation();
  const { mutate: triggerCheck, isPending } = useTriggerCheck();
  const { toast } = useToast();

  const handleTrigger = () => {
    triggerCheck(undefined, {
      onSuccess: () => {
        toast({
          title: "Sync complete",
          description: "Successfully checked all active RSS feeds.",
        });
      },
      onError: (err) => {
        toast({
          title: "Sync failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const navItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Monitors", url: "/monitors", icon: RadioReceiver },
    { title: "AI Assistant", url: "/chat", icon: MessageSquare },
  ];

  return (
    <Sidebar className="border-r border-white/10 glass-ultra shadow-2xl shadow-black/40 z-40 overflow-hidden">
      <SidebarContent>
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.75rem] glass-card-premium text-primary shadow-[0_0_20px_hsl(var(--primary)/0.14)] hover-lift">
              <RadioReceiver className="h-6 w-6" />
            </div>
            <span className="rounded-full glass-card-premium px-3 py-1 text-[11px] uppercase tracking-[0.36em] text-gradient-primary animate-shimmer">
              Live
            </span>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground text-gradient-sapphire">Smart Feeds</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/80">Fast, premium scanning and notifications.</p>
          </div>
        </div>

        <SidebarGroup className="py-6">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-5 px-6">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3">
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className={`transition-all duration-300 rounded-3xl mb-2 hover-lift active-press ${
                        isActive
                          ? "glass-card-premium text-primary font-semibold shadow-[0_0_16px_hsl(var(--primary)/0.18)] border border-primary/20 animate-pulse-glow"
                          : "glass-card-subtle text-muted-foreground border border-transparent hover:shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:text-foreground"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-4 px-4 py-3">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-white/10 glass-card-premium">
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-3xl font-semibold text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-primary/40 hover-lift active-press disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 animate-gradient-flow"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Syncing Feeds...' : 'Force Sync Now'}
        </button>
        <div className="mt-5 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary animate-pulse-glow"></span>
            </span>
            <span>System Online</span>
          </div>
          <span className="rounded-full glass-card-premium px-2 py-1 text-[10px] uppercase tracking-[0.35em] text-muted-foreground/80">
            Sync Ready
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
