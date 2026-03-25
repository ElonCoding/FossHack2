"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import * as React from "react";
import { apiFetch } from "@/lib/api";

const EventCard = dynamic(() => import("@/components/events/event-card").then((mod) => mod.EventCard), {
  ssr: false,
});

type EventItem = {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  image: string;
};

type EventApiItem = {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  eventDate?: string;
  date?: string;
  location?: {
    venue?: string;
    city?: string;
    country?: string;
  };
};

export default function EventsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [search, setSearch] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [fetchingEvents, setFetchingEvents] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, router, user]);

  React.useEffect(() => {
    if (!user) return;
    const fetchEvents = async () => {
      setFetchingEvents(true);
      setError(null);
      try {
        const response = await apiFetch<{ events: EventApiItem[] }>("/events?status=PUBLISHED", { method: "GET" });
        const mapped = response.events.map((event) => ({
          id: event.id || String(event._id),
          title: event.title,
          description: event.description,
          date: new Date(event.eventDate ?? event.date ?? Date.now()).toLocaleDateString(),
          location: [event.location?.venue, event.location?.city, event.location?.country].filter(Boolean).join(", "),
          image: "/placeholder.svg",
        }));
        setEvents(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setFetchingEvents(false);
      }
    };
    fetchEvents();
  }, [user]);

  if (loading || !user) {
    return <main className="container py-8">Loading...</main>;
  }

  const filteredEvents = events.filter((event) => {
    const textMatch =
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase());
    if (dateFilter === "all") return textMatch;
    return textMatch;
  });

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold">Events</h1>
        <Button onClick={() => router.push("/dashboard")}>Create Event</Button>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <Input
          placeholder="Search events..."
          className="flex-grow"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
      {fetchingEvents && <p className="mt-6 text-sm text-muted-foreground">Loading events...</p>}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </main>
  );
}
