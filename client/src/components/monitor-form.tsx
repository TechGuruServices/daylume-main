import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonitorSchema } from "@shared/schema";
import { type MonitorInput } from "@shared/routes";
import { useCreateMonitor, useUpdateMonitor } from "@/hooks/use-monitors";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface MonitorFormProps {
  initialData?: MonitorInput & { id?: number };
  onSuccess: () => void;
  onCancel: () => void;
}

export function MonitorForm({ initialData, onSuccess, onCancel }: MonitorFormProps) {
  const isEditing = !!initialData?.id;
  const createMutation = useCreateMonitor();
  const updateMutation = useUpdateMonitor();

  const form = useForm<MonitorInput>({
    resolver: zodResolver(insertMonitorSchema),
    defaultValues: {
      name: initialData?.name || "",
      url: initialData?.url || "",
      active: initialData?.active ?? true,
    },
  });

  const onSubmit = (data: MonitorInput) => {
    if (isEditing && initialData.id) {
      updateMutation.mutate(
        { id: initialData.id, ...data },
        { onSuccess }
      );
    } else {
      createMutation.mutate(data, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Monitor Name ── */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Monitor Name
              </FormLabel>
              <FormControl>
                <input
                  placeholder="e.g. SF Bay Area Free Stuff"
                  className="input-premium"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── RSS URL ── */}
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Craigslist RSS URL
              </FormLabel>
              <FormControl>
                <input
                  placeholder="https://sfbay.craigslist.org/search/zip?format=rss"
                  className="input-premium font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-[11px] mt-1.5 text-muted-foreground/70">
                Go to Craigslist → search → append{" "}
                <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-blue-400 text-[10px]">
                  ?format=rss
                </code>{" "}
                to the URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Active Toggle ── */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl
                                 border border-white/[0.07] bg-white/[0.03] p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium text-foreground">Active Status</FormLabel>
                <FormDescription className="text-xs text-muted-foreground/70">
                  When disabled, this monitor will be skipped.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-blue-500"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary flex-1"
          >
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Add Monitor"}
          </button>
        </div>
      </form>
    </Form>
  );
}
