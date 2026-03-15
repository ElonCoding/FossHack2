"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Ticket, CalendarIcon, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [organizerStats, setOrganizerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to resolve before redirecting
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
      
      const regRes = await api.get("/tickets/my-registrations");
      setRegistrations(regRes.data.registrations);
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
        {user.role === "ORGANIZER" && (
          <Link href="/events/create">
            <Button>Create New Event</Button>
          </Link>
        )}
      </div>

      {user.role === "ORGANIZER" && organizerStats && (
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
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizerStats.totalRegistrations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <span className="text-muted-foreground font-bold">$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${organizerStats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Your Registrations</h2>
        {registrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-40">
              <Ticket className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">You haven&apos;t registered for any events yet.</p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/events">Browse Events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {registrations.map((reg) => (
              <Card key={reg.id} className="overflow-hidden">
                <div className="h-2 w-full bg-primary" />
                <CardHeader>
                  <CardTitle>{reg.event.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(reg.event.date), "PPP - p")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticket Type</span>
                      <span className="font-medium">{reg.ticketType.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-medium ${reg.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-amber-600'}`}>
                        {reg.paymentStatus}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
