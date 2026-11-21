import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Loader2, DollarSign, Package, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/flashreserve';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCampaignModal({ open, onOpenChange }: CreateCampaignModalProps) {
  const queryClient = useQueryClient();

  const getDefaultStartsAt = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const getDefaultEndsAt = (hoursAhead = 24) => {
    const future = new Date(Date.now() + hoursAhead * 3600 * 1000);
    future.setMinutes(future.getMinutes() - future.getTimezoneOffset());
    return future.toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState('');
  const [priceUsd, setPriceUsd] = useState('299.00');
  const [totalInventory, setTotalInventory] = useState('500');
  const [startsAt, setStartsAt] = useState(getDefaultStartsAt());
  const [endsAt, setEndsAt] = useState(getDefaultEndsAt(24));
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      setError('');
      const priceCents = Math.round(parseFloat(priceUsd) * 100);
      const inventory = parseInt(totalInventory, 10);

      if (!title.trim()) throw new Error('Please provide a campaign title.');
      if (isNaN(priceCents) || priceCents <= 0) throw new Error('Price must be greater than $0.00.');
      if (isNaN(inventory) || inventory <= 0) throw new Error('Inventory must be at least 1 unit.');

      const startsIso = new Date(startsAt).toISOString();
      const endsIso = new Date(endsAt).toISOString();

      if (new Date(endsIso) <= new Date(startsIso)) {
        throw new Error('End time must be after the start time.');
      }

      return api.createCampaign({
        title: title.trim(),
        priceCents,
        totalInventory: inventory,
        startsAt: startsIso,
        endsAt: endsIso,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      onOpenChange(false);
      setTitle('');
      setPriceUsd('299.00');
      setTotalInventory('500');
      setError('');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(msg);
    },
  });

  const handleDurationPreset = (hours: number) => {
    setEndsAt(getDefaultEndsAt(hours));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>Create New Flash Campaign</DialogTitle>
          <DialogDescription>
            Configure inventory and drop schedule. Stock is automatically loaded into the atomic Redis allocation engine.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive" role="alert">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Campaign Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sony PlayStation 5 Pro Limited Drop"
              required
              disabled={createMutation.isPending}
            />
          </div>

          {/* Price and Inventory Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Drop Price (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  placeholder="299.00"
                  className="pl-8"
                  required
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Total Inventory Units
              </label>
              <div className="relative">
                <Package className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  value={totalInventory}
                  onChange={(e) => setTotalInventory(e.target.value)}
                  placeholder="500"
                  className="pl-8"
                  required
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Start Time
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="pl-8 text-xs"
                  required
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                End Time
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="pl-8 text-xs"
                  required
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
          </div>

          {/* Duration Presets */}
          <div>
            <span className="text-[11px] text-muted-foreground block mb-1.5">
              Quick duration presets:
            </span>
            <div className="flex gap-2">
              {[
                { label: '1 Hour', hours: 1 },
                { label: '6 Hours', hours: 6 },
                { label: '24 Hours', hours: 24 },
                { label: '3 Days', hours: 72 },
                { label: '7 Days', hours: 168 },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 py-0"
                  onClick={() => handleDurationPreset(preset.hours)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="size-4" /> Create & Preload Stock
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
