"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPin, Users, Loader2 } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  description: string;
  location: { venue: string; city: string; country: string };
  eventDate: string;
  organizerId: string;
  ticketTypes: Array<{ name: string; price: number; limit: number }>;
};

export default function EventDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetails = useCallback(async () => {
    try {
      const res = await apiFetch<{ event: EventItem }>(`/events/${id}`, { method: "GET" });
      setEvent(res.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [fetchEventDetails, id]);

  const handleRegister = async (ticketTypeName: string) => {
    if (!user) {
      router.push("/signin");
      return;
    }

    try {
      setIsRegistering(true);
      await apiFetch<{ registration: { id: string } }>(`/events/${id}/register`, {
        method: "POST",
        body: {
          ticketType: ticketTypeName,
          registrationData: {
            source: "web",
          },
        },
      });
      setError(null);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
        <Button variant="link" onClick={() => router.push("/events")}>
          Back to Events
        </Button>
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
                {new Date(event.eventDate).toLocaleString()}
              </span>
              <span className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {[event.location?.venue, event.location?.city, event.location?.country].filter(Boolean).join(", ")}
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
              <CardTitle>Registration</CardTitle>
              <CardDescription>Select a ticket type to attend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center">
                  <Users className="mr-2 h-4 w-4" /> Tickets
                </span>
                <span className="font-medium">{event.ticketTypes?.length || 0} types</span>
              </div>
              <div className="border-t pt-4 space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                {!event.ticketTypes || event.ticketTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center">
                    Tickets are not available yet.
                  </p>
                ) : (
                  event.ticketTypes.map((ticket) => (
                    <div key={ticket.name} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold">{ticket.name}</h4>
                        <span className="font-bold text-primary">₹{ticket.price > 0 ? ticket.price : "Free"}</span>
                      </div>
                      <div className="text-xs mt-2 mb-3 font-medium">{ticket.limit} total slots</div>
                      <Button className="w-full" onClick={() => handleRegister(ticket.name)} disabled={isRegistering}>
                        {isRegistering ? "Processing..." : "Register"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            {user?.role === "ORGANIZER" && user?.id === event.organizerId && (
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard`)}>
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
