"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  fps?: number;
  qrbox?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
  disableFlip = false,
}: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps, qrbox, aspectRatio, disableFlip },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, (error) => {
      if (onScanError) onScanError(error);
    });

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear html5QrcodeScanner", error));
      }
    };
  }, [onScanSuccess, onScanError, fps, qrbox, aspectRatio, disableFlip]);

  return <div id="qr-reader" className="w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-sm" />;
}
