"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/events");
      setEvents(res.data.events);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Discover Events</h1>
        <p className="text-xl text-muted-foreground mt-2">Find and register for the best tech fests and hackathons.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="line-clamp-2">{event.title}</CardTitle>
              <CardDescription className="flex items-center mt-2">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(new Date(event.date), "PPP")}
              </CardDescription>
              <CardDescription className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                {event.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="line-clamp-3 text-sm text-muted-foreground">{event.description}</p>
            </CardContent>
            <CardFooter className="pt-4 mt-auto border-t">
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  By {event.organizer.name}
                </span>
                <Link href={`/events/${event.id}`}>
                  <Button variant="default">View Details</Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="col-span-full py-10 text-center text-muted-foreground">
            No events found. Check back later!
          </div>
        )}
      </div>
    </div>
  );
}
