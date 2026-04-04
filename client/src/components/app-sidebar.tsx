import { Link, useLocation } from "wouter";
import { LayoutDashboard, RadioReceiver, RefreshCw, Activity, MessageSquare } from "lucide-react";
import { useTriggerCheck } from "@/hooks/use-jobs";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

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
    <Sidebar className="border-r border-white/5 bg-background/60 backdrop-blur-3xl shadow-2xl z-40">
      <SidebarContent>
        <SidebarGroup className="py-8">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-6 px-6">
            Application
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
                      className={`transition-all duration-300 rounded-xl mb-1 ${
                        isActive 
                          ? "bg-primary/10 text-primary font-semibold shadow-[0_0_15px_rgba(20,184,166,0.15)] border border-primary/20" 
                          : "hover:bg-card hover:text-foreground text-muted-foreground hover:shadow-md border border-transparent"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3.5 px-3 py-3">
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

      <SidebarFooter className="p-5 border-t border-white/5 bg-card/30">
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Syncing Feeds...' : 'Force Sync Now'}
        </button>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          System Online
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
