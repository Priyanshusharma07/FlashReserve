import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReservationLookup() {
  const [id, setId] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Ticket className="size-4" />
          <span className="hidden sm:inline">My reservation</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <div className="empty-symbol">
          <Ticket className="size-5" />
        </div>
        <DialogTitle>Find your reservation</DialogTitle>
        <DialogDescription>Enter your reservation ID to open its status page.</DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!id.trim()) {
              setError("Enter a reservation ID.");
              return;
            }
            setOpen(false);
            navigate({ to: "/reservations/$reservationId", params: { reservationId: id.trim() } });
          }}
        >
          <label htmlFor="reservation-id" className="block text-sm font-semibold">
            Reservation ID
          </label>
          <Input
            id="reservation-id"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setError("");
            }}
            placeholder="Enter reservation ID"
            autoComplete="off"
            maxLength={200}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="dark" className="w-full">
            Check reservation <ArrowUpRight />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
