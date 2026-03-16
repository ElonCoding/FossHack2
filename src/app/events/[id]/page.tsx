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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  organizer: {
    name: string;
    email: string;
  };
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  description: string;
  limit: number;
  sold: number;
}

export default function EventDetailsPage() {
  const { id } = useParams() as { id: string };
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchTicketTypes();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.event);
    } catch (error) {
      toast.error("Failed to load event");
      setIsLoading(false);
    }
  };

  const fetchTicketTypes = async () => {
    try {
      const res = await api.get(`/tickets/types/${id}`);
      setTicketTypes(res.data.ticketTypes);
    } catch (error) {
      console.error("Failed to load ticket types");
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
      
      const res = await api.post("/tickets/order", {
        eventId: id,
        ticketTypeId,
        quantity: 1, // Default to 1 for now
      });

      toast.success("Order placed successfully! Check your tickets in dashboard.");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Order failed");
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
        <Button variant="link" onClick={() => router.push("/events")} className="mt-4">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
        ← Back
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{event.title}</h1>
            <div className="flex items-center text-muted-foreground gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {format(new Date(event.date), "PPP p")}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            </div>
          </div>

          <div className="prose max-w-none dark:prose-invert">
            <h3 className="text-xl font-semibold mb-2">About this event</h3>
            <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>
          </div>

          <div className="bg-muted/50 p-6 rounded-lg border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organizer
            </h3>
            <p className="font-medium">{event.organizer.name}</p>
            <p className="text-sm text-muted-foreground">{event.organizer.email}</p>
          </div>
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Get Tickets</CardTitle>
              <CardDescription>Select a ticket type to register</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketTypes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No tickets available yet.</p>
              ) : (
                ticketTypes.map((type) => (
                  <div key={type.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{type.name}</h4>
                      <span className="font-bold text-primary">
                        {type.price === 0 ? "Free" : `$${type.price}`}
                      </span>
                    </div>
                    {type.description && <p className="text-xs text-muted-foreground mb-3">{type.description}</p>}
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                      <span>{type.limit - type.sold} left</span>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleRegister(type.id)}
                      disabled={isRegistering || type.limit <= type.sold}
                    >
                      {isRegistering ? "Processing..." : (type.limit <= type.sold ? "Sold Out" : "Get Ticket")}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="text-xs text-center text-muted-foreground">
              Secure payment processing via Stripe/Razorpay (Simulated)
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
