"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, ArrowLeft, CalendarIcon, MapPin, Ticket as TicketIcon } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

export default function TicketPage() {
  const { registrationId } = useParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [registration, setRegistration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (registrationId && user) {
      fetchTicket();
    }
  }, [registrationId, user]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      // We retrieve registrations and find this one
      const res = await api.get("/tickets/my-registrations");
      const reg = res.data.registrations.find((r: any) => r.id === registrationId);
      
      if (!reg) {
        toast.error("Ticket not found");
        router.push("/dashboard");
        return;
      }
      
      setRegistration(reg);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load ticket");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || authLoading || !registration) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-md">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Your Ticket</h1>
      </div>

      <Card className="overflow-hidden border-2">
        <div className="bg-primary p-6 text-primary-foreground">
          <h2 className="text-xl font-bold line-clamp-2">{registration.event.title}</h2>
          <div className="flex flex-col gap-1 mt-2 text-sm opacity-90">
            <span className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(new Date(registration.event.date), "PPP - p")}
            </span>
            <span className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              {registration.event.location}
            </span>
          </div>
        </div>
        
        <CardContent className="flex flex-col items-center py-8">
          <div className="bg-white p-4 rounded-xl shadow-inner border mb-6">
            <QRCode value={registration.qrCodeData} size={200} />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Attendee</p>
            <p className="text-xl font-bold">{registration.user.name}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded bg-muted text-xs font-semibold">
                {registration.ticketType.name}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                registration.paymentStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {registration.paymentStatus}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/50 border-t flex flex-col p-6 gap-4">
          <div className="flex justify-between w-full text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs">{registration.id.toUpperCase()}</span>
          </div>
          <Button className="w-full" variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </CardFooter>
      </Card>
      
      <p className="text-center text-xs text-muted-foreground mt-6 px-4">
        Please present this QR code at the event entrance for validation.
      </p>
    </div>
  );
}
