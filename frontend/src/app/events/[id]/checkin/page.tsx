"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRScanner } from "@/components/qr-scanner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function CheckInPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [isScanning, setIsScanning] = useState(true);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleScanSuccess = async (decodedText: string) => {
    if (isValidating) return;
    
    try {
      setIsValidating(true);
      setIsScanning(false);
      
      const res = await api.post("/checkin", {
        eventId: id,
        qrCodeValue: decodedText, // Corrected field name
      });

      setLastResult({
        success: true,
        message: "Check-in Successful!",
        data: res.data,
      });
      toast.success("Successfully checked in!");
    } catch (error: any) {
      setLastResult({
        success: false,
        message: error.response?.data?.message || "Check-in failed. Invalid or already used ticket.",
      });
      toast.error("Check-in failed");
    } finally {
      setIsValidating(false);
    }
  };

  const resetScanner = () => {
    setLastResult(null);
    setIsScanning(true);
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-in Scanner</h1>
          <p className="text-muted-foreground">Scan attendee QR codes to validate entry</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6">
        {isScanning ? (
          <div className="w-full">
            <QRScanner onScanSuccess={handleScanSuccess} />
            <p className="text-center text-sm text-muted-foreground mt-4">
              Center the QR code in the frame to scan automatically.
            </p>
          </div>
        ) : (
          <Card className="w-full max-w-md border-2">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {lastResult?.success ? (
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-destructive" />
                )}
              </div>
              <CardTitle className={lastResult?.success ? "text-green-600" : "text-destructive"}>
                {lastResult?.message}
              </CardTitle>
              {lastResult?.success && lastResult.data && (
                <CardDescription className="text-lg font-medium text-foreground mt-2">
                  {lastResult.data.user.name}
                  <br />
                  <span className="text-sm font-normal text-muted-foreground">
                    Ticket: {lastResult.data.ticketType}
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={resetScanner}>
                Scan Next Ticket
              </Button>
            </CardContent>
          </Card>
        )}

        {isValidating && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Validating ticket...</p>
          </div>
        )}
      </div>
    </div>
  );
}
