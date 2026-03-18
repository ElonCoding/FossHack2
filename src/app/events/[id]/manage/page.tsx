"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

export default function ManageEventPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    price: 0,
    limit: 100,
    description: ""
  });
  const [isAddingTicket, setIsAddingTicket] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventData();
    }
  }, [id]);

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      const eventRes = await api.get(`/events/${id}`);
      setEvent(eventRes.data.event);

      // Check ownership
      if (user?.role !== "ADMIN" && eventRes.data.event.organizerId !== user?.id) {
        toast.error("You are not authorized to manage this event");
        router.push("/dashboard");
        return;
      }

      const typesRes = await api.get(`/tickets/types/${id}`);
      setTicketTypes(typesRes.data.ticketTypes);

      const regRes = await api.get(`/dashboard/events/${id}/registrations`);
      setRegistrations(regRes.data.registrations);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load event data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTicketType = async () => {
    try {
      setIsAddingTicket(true);
      await api.post(`/tickets/types/${id}`, newTicketType);
      toast.success("Ticket type added successfully");
      setNewTicketType({ name: "", price: 0, limit: 100, description: "" });
      
      // Refresh ticket types
      const typesRes = await api.get(`/tickets/types/${id}`);
      setTicketTypes(typesRes.data.ticketTypes);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add ticket type");
    } finally {
      setIsAddingTicket(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Event</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/events/${id}`)}>
          View Public Page
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Types</CardTitle>
              <CardDescription>Manage tickets available for this event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketTypes.map((type) => (
                <div key={type.id} className="flex justify-between items-center border p-3 rounded-md">
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-sm text-muted-foreground">${type.price} • {type.limit} total</p>
                  </div>
                  <div className="text-sm">
                    {type.sold} sold
                  </div>
                </div>
              ))}
              
              <Dialog>
                <DialogTrigger>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Add Ticket Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Ticket Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        value={newTicketType.name} 
                        onChange={(e) => setNewTicketType({...newTicketType, name: e.target.value})}
                        placeholder="e.g. Early Bird" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input 
                          type="number" 
                          min="0"
                          value={newTicketType.price} 
                          onChange={(e) => setNewTicketType({...newTicketType, price: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Limit</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={newTicketType.limit} 
                          onChange={(e) => setNewTicketType({...newTicketType, limit: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input 
                        value={newTicketType.description} 
                        onChange={(e) => setNewTicketType({...newTicketType, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddTicketType} disabled={isAddingTicket}>
                      {isAddingTicket ? "Adding..." : "Add Ticket Type"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest attendees who signed up</CardDescription>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No registrations yet.</p>
              ) : (
                <div className="space-y-4">
                  {registrations.slice(0, 10).map((reg) => (
                    <div key={reg.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{reg.user.name}</p>
                        <p className="text-xs text-muted-foreground">{reg.user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{reg.ticketType.name}</p>
                        <p className={`text-xs ${reg.isCheckedIn ? 'text-green-600' : 'text-blue-600'}`}>
                          {reg.isCheckedIn ? 'Checked In' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
