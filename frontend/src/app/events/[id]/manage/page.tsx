"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, Plus, QrCode, Users, Ticket, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Attendee {
  id: string;
  name: string;
  email: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  limit: number;
  sold: number;
  description?: string;
}

interface Registration {
  id: string;
  user: Attendee;
  ticketType: { name: string; price: number };
  order: { status: string; paymentRef: string };
  isCheckedIn: boolean;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ManageEventPage() {
  const { id } = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTicket, setIsAddingTicket] = useState(false);

  // New ticket state
  const [newTicket, setNewTicket] = useState({
    name: "",
    price: 0,
    limit: 100,
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (id && user) {
      // Early ownership check if event is already known (optional, but we fetch anyway)
      fetchEventData();
    }
  }, [id, user]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      const [eventRes, ticketsRes, regsRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/tickets/types/${id}`),
        api.get(`/dashboard/events/${id}/registrations`),
      ]);

      setEvent(eventRes.data.event);
      setTicketTypes(ticketsRes.data.ticketTypes);
      setRegistrations(regsRes.data.registrations);

      // Verify ownership
      if (user && eventRes.data.event.organizerId !== user.id && user.role !== 'ADMIN') {
        toast.error("You are not authorized to manage this event");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load event data (verify API connection)");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicketType = async () => {
    try {
      setIsAddingTicket(true);
      await api.post(`/tickets/types/${id}`, newTicket);
      toast.success("Ticket type created successfully");
      setNewTicket({ name: "", price: 0, limit: 100, description: "" });
      fetchEventData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create ticket type");
    } finally {
      setIsAddingTicket(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Event</h1>
          <p className="text-muted-foreground">{event?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEventData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => router.push(`/events/${id}/checkin`)}>
            <QrCode className="mr-2 h-4 w-4" /> Check-in Scanner
          </Button>
        </div>
      </div>

      <Tabs defaultValue="registrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registrations">
            <Users className="mr-2 h-4 w-4" /> Registrations
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="mr-2 h-4 w-4" /> Ticket Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendees</CardTitle>
              <CardDescription>
                {registrations.length} tickets sold for this event.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Checked In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrations.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        <div>
                          {ticket.user.name}
                          <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{ticket.ticketType.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          ticket.order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ticket.order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {ticket.isCheckedIn ? (
                          <span className="text-green-600 font-medium inline-flex items-center">
                            <QrCode className="mr-1 h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {registrations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No registrations yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Ticket Type
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Ticket Type</DialogTitle>
                  <DialogDescription>
                    Add a new ticket category for your event.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Ticket Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. Early Bird, General, VIP" 
                      value={newTicket.name}
                      onChange={(e) => setNewTicket({...newTicket, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input 
                        id="price" 
                        type="number" 
                        value={newTicket.price}
                        onChange={(e) => setNewTicket({...newTicket, price: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="limit">Total Limit</Label>
                      <Input 
                        id="limit" 
                        type="number" 
                        value={newTicket.limit}
                        onChange={(e) => setNewTicket({...newTicket, limit: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea 
                      id="desc" 
                      placeholder="What does this ticket include?" 
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateTicketType} disabled={isAddingTicket}>
                    {isAddingTicket ? "Creating..." : "Create Ticket Type"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ticketTypes.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <CardTitle>{ticket.name}</CardTitle>
                  <CardDescription className="text-xl font-bold text-primary">
                    ${ticket.price}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sold / Limit</span>
                      <span className="font-medium">{ticket.sold} / {ticket.limit}</span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2 mt-2">
                      {ticket.description || "No description provided."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
