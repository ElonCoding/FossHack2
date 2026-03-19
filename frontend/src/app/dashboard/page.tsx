"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Ticket, CalendarIcon, Loader2, Users, QrCode } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import QRCode from "react-qr-code";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      if (user?.role === "ORGANIZER" || user?.role === "ADMIN") {
        const statsRes = await api.get("/dashboard/stats");
        setOrganizerStats(statsRes.data);
      }
      
      const ticketsRes = await api.get("/tickets/my-tickets");
      setTickets(ticketsRes.data.tickets);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}!</p>
        </div>
        {(user.role === "ORGANIZER" || user.role === "ADMIN") && (
          <Link href="/events/create">
            <Button>Create New Event</Button>
          </Link>
        )}
      </div>

      {(user.role === "ORGANIZER" || user.role === "ADMIN") && organizerStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizerStats.totalEvents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizerStats.totalTicketsSold}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <span className="text-muted-foreground font-bold">$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${organizerStats.totalRevenue}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-2xl font-bold tracking-tight mb-4">My Tickets</h2>
      {tickets.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">You haven't purchased any tickets yet.</p>
          <Link href="/events">
            <Button variant="outline">Browse Events</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="line-clamp-1">{ticket.event.title}</CardTitle>
                    <CardDescription>{format(new Date(ticket.event.date), "PPP")}</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger>
                      <Button variant="outline" size="icon" aria-label="View QR code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Ticket QR Code</DialogTitle>
                      </DialogHeader>
                      <div className="flex items-center justify-center py-6">
                        <QRCode value={ticket.qrCodeValue} size={200} />
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        Scan this code at the event entrance
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{ticket.ticketType.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{ticket.event.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium ${ticket.isCheckedIn ? 'text-green-600' : 'text-blue-600'}`}>
                      {ticket.isCheckedIn ? 'Checked In' : 'Active'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
