import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MonitorInput, type MonitorUpdateInput } from "@shared/routes";

export function useMonitors() {
  return useQuery({
    queryKey: [api.monitors.list.path],
    queryFn: async () => {
      const res = await fetch(api.monitors.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch monitors");
      return api.monitors.list.responses[200].parse(await res.json());
    },
  });
}

export function useMonitor(id: number) {
  return useQuery({
    queryKey: [api.monitors.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.monitors.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch monitor");
      return api.monitors.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: MonitorInput) => {
      const validated = api.monitors.create.input.parse(data);
      const res = await fetch(api.monitors.create.path, {
        method: api.monitors.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.monitors.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create monitor");
      }
      return api.monitors.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
    },
  });
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & MonitorUpdateInput) => {
      const validated = api.monitors.update.input.parse(updates);
      const url = buildUrl(api.monitors.update.path, { id });
      const res = await fetch(url, {
        method: api.monitors.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.monitors.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 404) throw new Error("Monitor not found");
        throw new Error("Failed to update monitor");
      }
      return api.monitors.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.monitors.get.path, variables.id] });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.monitors.delete.path, { id });
      const res = await fetch(url, {
        method: api.monitors.delete.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Monitor not found");
      if (!res.ok) throw new Error("Failed to delete monitor");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monitors.list.path] });
      // Invalidate items since deleting a monitor usually cascades or orphans items
      queryClient.invalidateQueries({ queryKey: [api.items.list.path] });
    },
  });
}
