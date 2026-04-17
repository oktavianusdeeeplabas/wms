import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CameraOff, X, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerIdRef = useRef(`qr-reader-${Date.now()}`);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      try {
        scannerRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);
    setLastScanned(null);

    try {
      // Ensure previous scanner is stopped
      await stopScanner();

      const scannerId = scannerIdRef.current;
      const element = document.getElementById(scannerId);
      if (!element) {
        setError('Scanner container not found');
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setLastScanned(decodedText);
          onScan(decodedText);
          // Don't auto-stop, let user continue scanning
        },
        () => {
          // Scan failure callback - ignore, just means no code found in this frame
        }
      );

      setIsScanning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      if (message.includes('Permission') || message.includes('NotAllowed')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (message.includes('NotFound') || message.includes('DevicesNotFound')) {
        setError('No camera found on this device.');
      } else {
        setError(message);
      }
      setIsScanning(false);
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Barcode / QR Scanner</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopScanner();
                onClose();
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Scanner Area */}
          <div className="relative bg-black" ref={containerRef}>
            <div
              id={scannerIdRef.current}
              className="w-full"
              style={{ minHeight: isScanning ? '300px' : '200px' }}
            />

            {!isScanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white">
                <Camera className="w-12 h-12 mb-3 text-slate-400" />
                <p className="text-sm text-slate-300 mb-4">
                  Point your camera at a barcode or QR code
                </p>
                <Button
                  onClick={startScanner}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            )}

            {/* Scan overlay animation */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[250px] h-[250px] relative">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400" />
                  {/* Scanning line animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-blue-400 animate-scan-line" />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border-t border-red-100">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={startScanner}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Last scanned result */}
          {lastScanned && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium mb-1">Last Scanned:</p>
              <p className="text-sm font-mono text-emerald-800 break-all">{lastScanned}</p>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-t flex gap-2">
            {isScanning ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={stopScanner}
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Stop Camera
              </Button>
            ) : (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={startScanner}
              >
                <Camera className="w-4 h-4 mr-2" />
                {error ? 'Retry' : 'Start Scanning'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                stopScanner();
                onClose();
              }}
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}