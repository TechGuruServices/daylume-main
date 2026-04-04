import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useTriggerCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.jobs.triggerCheck.path, {
        method: api.jobs.triggerCheck.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trigger check");
      return api.jobs.triggerCheck.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate monitors to update 'lastChecked'
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
      // Invalidate items to show new finds
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    },
  });
}
