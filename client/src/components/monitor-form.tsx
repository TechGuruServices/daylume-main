import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMonitorSchema } from "@shared/schema";
import { type MonitorInput } from "@shared/routes";
import { useCreateMonitor, useUpdateMonitor } from "@/hooks/use-monitors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monitor Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. SF Bay Area Free Stuff" 
                  className="bg-background focus-visible:ring-primary/20 focus-visible:border-primary"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Craigslist RSS URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://sfbay.craigslist.org/search/zip?format=rss" 
                  className="bg-background focus-visible:ring-primary/20 focus-visible:border-primary"
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-xs mt-1 text-muted-foreground/80">
                Go to Craigslist, do a search, and append <code className="bg-muted px-1 rounded text-foreground">?format=rss</code> to the URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-4 bg-muted/10">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>
                  When disabled, this monitor will be skipped during checks.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-primary"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
          >
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Monitor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
