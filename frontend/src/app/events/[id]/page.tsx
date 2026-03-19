"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TicketType {
  id: string;
  name: string;
  price: number;
  limit: number;
  sold: number;
  description?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  organizerId: string;
  ticketTypes: TicketType[];
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EventDetailsPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch (error) {
      toast.error("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (ticketTypeId: string) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    try {
      setIsRegistering(true);
      // Backend createOrder handles ticket generation as well in this mock setup
      await api.post("/tickets/order", {
        eventId: id as string,
        ticketTypeId,
        quantity: 1
      });

      toast.success("Order successful! Your ticket is available in the dashboard.");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Purchase failed");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Button variant="link" onClick={() => router.push("/events")}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap gap-4 mt-4 text-muted-foreground">
              <span className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(event.date), "PPP - p")}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {event.location}
              </span>
            </div>
          </div>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold">About this event</h3>
            <p className="whitespace-pre-wrap mt-2 text-muted-foreground bg-card p-6 rounded-lg border">
              {event.description}
            </p>
          </div>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>Choose your entry type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <Users className="mr-2 h-4 w-4" /> Capacity
                </span>
                <span className="font-medium">{event.capacity} total slots</span>
              </div>
              <div className="border-t pt-4 space-y-4">
                {!event.ticketTypes || event.ticketTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center">
                    Tickets are not available yet.
                  </p>
                ) : (
                  event.ticketTypes.map((ticket) => (
                    <Dialog key={ticket.id}>
                      <DialogTrigger render={
                        <div className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold">{ticket.name}</h4>
                            <span className="font-bold text-primary">
                              ${ticket.price > 0 ? ticket.price : "Free"}
                            </span>
                          </div>
                          {ticket.description && (
                            <p className="text-xs text-muted-foreground">{ticket.description}</p>
                          )}
                          <div className="text-xs mt-2 font-medium">
                            {ticket.limit - ticket.sold} remaining
                          </div>
                        </div>
                      } />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Purchase</DialogTitle>
                          <DialogDescription>
                            Get a <strong>{ticket.name}</strong> ticket for <strong>{event.title}</strong>.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="font-semibold text-lg py-4 border-y my-2 flex justify-between">
                          <span>Amount</span>
                          <span>${ticket.price}</span>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => handleRegister(ticket.id)}
                          disabled={isRegistering || (ticket.limit - ticket.sold <= 0)}
                        >
                          {isRegistering ? "Processing..." : (ticket.limit - ticket.sold <= 0 ? "Sold Out" : "Confirm & Pay")}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  ))
                )}
              </div>
            </CardContent>
            {user?.role === "ORGANIZER" && user?.id === event.organizerId && (
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/events/${event.id}/manage`)}>
                  Manage Event
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
