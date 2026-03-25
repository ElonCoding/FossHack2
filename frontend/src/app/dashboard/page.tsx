"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { EntitySection } from "@/components/dashboard/entity-section";

type UserItem = { id: string; name: string; email: string; role: string };
type EventItem = { id: string; title: string; slug: string };
type RegistrationItem = { id: string; ticketType: string; eventId: string };
type TicketItem = { id: string; ticketCode: string; status: string };
type PaymentItem = { id: string; amount: number; currency: string; status: string };
type CheckinItem = { id: string; ticketId: string; checkedInAt: string };
type NotificationItem = { id: string; title: string; message: string };
type AnnouncementItem = { id: string; title: string; message: string };

type ApiCollectionState = {
  users: UserItem[];
  events: EventItem[];
  registrations: RegistrationItem[];
  tickets: TicketItem[];
  payments: PaymentItem[];
  checkins: CheckinItem[];
  notifications: NotificationItem[];
  announcements: AnnouncementItem[];
};

const defaultState: ApiCollectionState = {
  users: [],
  events: [],
  registrations: [],
  tickets: [],
  payments: [],
  checkins: [],
  notifications: [],
  announcements: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = React.useState<ApiCollectionState>(defaultState);
  const [busy, setBusy] = React.useState(false);
  const [eventIdForAnnouncement, setEventIdForAnnouncement] = React.useState("");
  const [newAnnouncementTitle, setNewAnnouncementTitle] = React.useState("");
  const [newAnnouncementMessage, setNewAnnouncementMessage] = React.useState("");
  const [newEventTitle, setNewEventTitle] = React.useState("");
  const [newEventSlug, setNewEventSlug] = React.useState("");
  const [newEventVenue, setNewEventVenue] = React.useState("");
  const [newEventCity, setNewEventCity] = React.useState("");
  const [newEventCountry, setNewEventCountry] = React.useState("India");
  const [newEventDate, setNewEventDate] = React.useState("");
  const [newEventDeadline, setNewEventDeadline] = React.useState("");
  const [registerEventId, setRegisterEventId] = React.useState("");
  const [registerTicketType, setRegisterTicketType] = React.useState("General");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const [eventsRes, registrationsRes, ticketsRes, paymentsRes, notificationsRes] = await Promise.all([
        apiFetch<{ events: EventItem[] }>("/events", { method: "GET" }),
        apiFetch<{ registrations: RegistrationItem[] }>("/registrations/me", { method: "GET" }),
        apiFetch<{ tickets: TicketItem[] }>("/tickets/me", { method: "GET" }),
        apiFetch<{ payments: PaymentItem[] }>("/payments/me", { method: "GET" }),
        apiFetch<{ notifications: NotificationItem[] }>("/notifications", { method: "GET" }),
      ]);

      const usersRes = user.role === "ADMIN" ? await apiFetch<{ users: UserItem[] }>("/users", { method: "GET" }) : { users: [] };
      const announcementsRes =
        eventIdForAnnouncement && eventIdForAnnouncement.trim().length > 0
          ? await apiFetch<{ announcements: AnnouncementItem[] }>(`/events/${eventIdForAnnouncement}/announcements`, { method: "GET" })
          : { announcements: [] };
      const checkinsRes =
        eventIdForAnnouncement && eventIdForAnnouncement.trim().length > 0
          ? await apiFetch<{ checkins: CheckinItem[] }>(`/events/${eventIdForAnnouncement}/checkins`, { method: "GET" }).catch(() => ({
              checkins: [],
            }))
          : { checkins: [] };

      setState({
        users: usersRes.users || [],
        events: eventsRes.events || [],
        registrations: registrationsRes.registrations || [],
        tickets: ticketsRes.tickets || [],
        payments: paymentsRes.payments || [],
        notifications: notificationsRes.notifications || [],
        announcements: announcementsRes.announcements || [],
        checkins: checkinsRes.checkins || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setBusy(false);
    }
  }, [eventIdForAnnouncement, user]);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
      return;
    }
    if (user) {
      loadData();
    }
  }, [loading, router, user, loadData]);

  if (loading || !user) {
    return <main className="container py-10">Loading...</main>;
  }

  const createEvent = async () => {
    if (!newEventTitle || !newEventSlug || !newEventVenue || !newEventCity || !newEventDate || !newEventDeadline) {
      setError("Please complete event fields");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ event: EventItem }>("/events", {
        method: "POST",
        body: {
          title: newEventTitle,
          slug: newEventSlug,
          description: `Event: ${newEventTitle}`,
          bannerUrl: "/uploads/banner.png",
          location: {
            venue: newEventVenue,
            city: newEventCity,
            country: newEventCountry || "India",
          },
          eventDate: new Date(newEventDate).toISOString(),
          registrationDeadline: new Date(newEventDeadline).toISOString(),
          ticketTypes: [{ name: "General", price: 0, limit: 200 }],
          status: "DRAFT",
        },
      });
      setMessage("Event created");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setBusy(false);
    }
  };

  const registerEvent = async () => {
    if (!registerEventId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/events/${registerEventId}/register`, {
        method: "POST",
        body: { ticketType: registerTicketType, registrationData: {} },
      });
      setMessage("Registration successful");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const createAnnouncement = async () => {
    if (!eventIdForAnnouncement || !newAnnouncementTitle || !newAnnouncementMessage) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/events/${eventIdForAnnouncement}/announcements`, {
        method: "POST",
        body: { title: newAnnouncementTitle, message: newAnnouncementMessage },
      });
      setMessage("Announcement posted");
      setNewAnnouncementTitle("");
      setNewAnnouncementMessage("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container mx-auto grid gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {user.name} ({user.role}) {user.isReadOnly ? "· Read-only demo account" : ""}
      </p>
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <EntitySection title="Events">
        {(user.role === "ORGANIZER" || user.role === "ADMIN") && !user.isReadOnly && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder="Title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
            <Input placeholder="Slug" value={newEventSlug} onChange={(e) => setNewEventSlug(e.target.value)} />
            <Input placeholder="Venue" value={newEventVenue} onChange={(e) => setNewEventVenue(e.target.value)} />
            <Input placeholder="City" value={newEventCity} onChange={(e) => setNewEventCity(e.target.value)} />
            <Input placeholder="Country" value={newEventCountry} onChange={(e) => setNewEventCountry(e.target.value)} />
            <Input type="datetime-local" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
            <Input type="datetime-local" value={newEventDeadline} onChange={(e) => setNewEventDeadline(e.target.value)} />
            <Button onClick={createEvent} disabled={busy}>
              Create Event
            </Button>
          </div>
        )}
        <div className="grid gap-2">
          {state.events.map((event) => (
            <div key={event.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{event.title}</div>
              <div className="text-muted-foreground">{event.slug}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      <EntitySection title="Registrations">
        {!user.isReadOnly && (
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Event ID"
              value={registerEventId}
              onChange={(e) => setRegisterEventId(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Ticket Type"
              value={registerTicketType}
              onChange={(e) => setRegisterTicketType(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={registerEvent} disabled={busy}>
              Register
            </Button>
          </div>
        )}
        <div className="grid gap-2">
          {state.registrations.map((registration) => (
            <div key={registration.id} className="rounded-md border p-3 text-sm">
              <div>{registration.ticketType}</div>
              <div className="text-muted-foreground">Event: {registration.eventId}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      <EntitySection title="Payments">
        <div className="grid gap-2">
          {state.payments.map((payment) => (
            <div key={payment.id} className="rounded-md border p-3 text-sm">
              <div>
                {payment.amount} {payment.currency}
              </div>
              <div className="text-muted-foreground">{payment.status}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      <EntitySection title="Tickets">
        <div className="grid gap-2">
          {state.tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-md border p-3 text-sm">
              <div>{ticket.ticketCode}</div>
              <div className="text-muted-foreground">{ticket.status}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      <EntitySection title="Notifications">
        <div className="grid gap-2">
          {state.notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border p-3 text-sm">
              <div>{notification.title}</div>
              <div className="text-muted-foreground">{notification.message}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      <EntitySection title="Announcements & Check-ins">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Event ID"
            value={eventIdForAnnouncement}
            onChange={(e) => setEventIdForAnnouncement(e.target.value)}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={loadData} disabled={busy}>
            Load Event Data
          </Button>
        </div>
        {(user.role === "ORGANIZER" || user.role === "ADMIN") && !user.isReadOnly && (
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="Announcement title"
              value={newAnnouncementTitle}
              onChange={(e) => setNewAnnouncementTitle(e.target.value)}
            />
            <Input
              placeholder="Announcement message"
              value={newAnnouncementMessage}
              onChange={(e) => setNewAnnouncementMessage(e.target.value)}
            />
            <Button onClick={createAnnouncement} disabled={busy}>
              Post Announcement
            </Button>
          </div>
        )}
        <div className="grid gap-2">
          {state.announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-md border p-3 text-sm">
              <div>{announcement.title}</div>
              <div className="text-muted-foreground">{announcement.message}</div>
            </div>
          ))}
          {state.checkins.map((checkin) => (
            <div key={checkin.id} className="rounded-md border p-3 text-sm">
              <div>Ticket: {checkin.ticketId}</div>
              <div className="text-muted-foreground">Checked in at {new Date(checkin.checkedInAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </EntitySection>

      {user.role === "ADMIN" && (
        <EntitySection title="Users">
          <div className="grid gap-2">
            {state.users.map((u) => (
              <div key={u.id} className="rounded-md border p-3 text-sm">
                <div>{u.name}</div>
                <div className="text-muted-foreground">
                  {u.email} · {u.role}
                </div>
              </div>
            ))}
          </div>
        </EntitySection>
      )}
    </main>
  );
}
