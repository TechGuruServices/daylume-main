import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink, Trash2, MapPin, Tag, PackageSearch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useItems, useDeleteItem } from "@/hooks/use-items";
import { useMonitors } from "@/hooks/use-monitors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// Helper to strip HTML and extract preview from Craigslist CDATA description
function stripHtml(html: string) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function Dashboard() {
  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: monitors } = useMonitors();
  const { mutate: deleteItem } = useDeleteItem();
  const { toast } = useToast();
  
  const [filterMonitor, setFilterMonitor] = useState<number | 'all'>('all');

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    deleteItem(id, {
      onSuccess: () => {
        toast({ title: "Item removed", description: "The item has been cleared from your dashboard." });
      }
    });
  };

  const filteredItems = items?.filter(item => 
    filterMonitor === 'all' ? true : item.monitorId === filterMonitor
  ) || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 relative">
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-glow bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-300% animate-gradient">
            Recent Finds
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">
            Fresh free items discovered from your active feeds.
          </p>
        </div>
        
        {monitors && monitors.length > 0 && (
          <div className="flex flex-wrap gap-2.5 z-10">
            <Button
              variant={filterMonitor === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMonitor('all')}
              className={`rounded-full transition-all duration-300 font-semibold px-5 ${
                filterMonitor === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.3)] border-transparent' 
                  : 'bg-background/40 backdrop-blur-md border border-white/10 hover:bg-card hover:text-foreground hover:border-white/20'
              }`}
            >
              All Items
            </Button>
            {monitors.map(m => (
              <Button
                key={m.id}
                variant={filterMonitor === m.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterMonitor(m.id)}
                className={`rounded-full transition-all duration-300 font-semibold px-5 ${
                  filterMonitor === m.id 
                    ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.3)] border-transparent' 
                    : 'bg-background/40 backdrop-blur-md border border-white/10 hover:bg-card hover:text-foreground hover:border-white/20'
                }`}
              >
                {m.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {itemsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-6 space-y-5 glass-card animate-pulse border-white/5 bg-card/40">
              <Skeleton className="h-7 w-3/4 rounded-xl bg-muted/50" />
              <Skeleton className="h-20 w-full rounded-xl bg-muted/50" />
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <Skeleton className="h-5 w-1/3 rounded-md bg-muted/50" />
                <Skeleton className="h-9 w-10 rounded-xl bg-muted/50" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center py-32 text-center glass-panel rounded-[2rem]"
        >
          <div className="bg-primary/10 p-7 rounded-full mb-8 text-primary shadow-[0_0_40px_rgba(20,184,166,0.15)] ring-1 ring-primary/20">
            <PackageSearch className="w-14 h-14" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-glow">No items found</h2>
          <p className="text-muted-foreground text-lg max-w-md font-medium">
            We haven't found any items matching your criteria yet. Ensure your monitors are active and try triggering a manual sync.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredItems.map((item, i) => {
              const monitor = monitors?.find(m => m.id === item.monitorId);
              const descriptionText = item.description ? stripHtml(item.description).slice(0, 140) + "..." : "No description available.";
              const postedDate = item.postedAt ? new Date(item.postedAt) : new Date(item.createdAt);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, delay: i * 0.05, type: "spring", stiffness: 100 }}
                >
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block group h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
                  >
                    <Card className="h-full flex flex-col p-7 glass-card hover-elevate relative overflow-hidden rounded-2xl">
                      {/* Ambient background glow for cards */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-500" />
                      
                      <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
                         <ExternalLink className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                      </div>
                      
                      <div className="inline-flex items-center gap-2 mb-4 text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 w-fit px-3 py-1.5 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(20,184,166,0.05)]">
                        <Tag className="w-3.5 h-3.5" />
                        {monitor?.name || 'Unknown Monitor'}
                      </div>
                      
                      <h3 className="text-xl font-bold font-display text-foreground line-clamp-2 leading-tight mb-3 group-hover:text-primary transition-colors duration-300 relative z-10">
                        {item.title}
                      </h3>
                      
                      <p className="text-muted-foreground/90 text-sm flex-grow line-clamp-3 mb-8 leading-relaxed relative z-10">
                        {descriptionText}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5 relative z-10 group-hover:border-white/10 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground/80 font-semibold drop-shadow-sm">
                            {formatDistanceToNow(postedDate, { addSuffix: true })}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                            {format(postedDate, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/15 -mr-2 z-20 relative rounded-xl hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          onClick={(e) => handleDelete(item.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
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
