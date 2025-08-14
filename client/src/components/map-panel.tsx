import { useEffect, useRef, useState } from "react";
import { taxiService, TaxiData } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

interface MapPanelProps {
  currentUser: any;
}

export default function MapPanel({ currentUser }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [taxis, setTaxis] = useState<TaxiData[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  
  const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google && window.google.maps) {
      setMapsLoaded(true);
      return;
    }
    if (!API_KEY || API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      setErrorMsg("Google Maps API key not configured.");
      return;
    }
    
    const id = "gmaps-script";
    if (document.getElementById(id)) return;
    
    const script = document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}`;
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => setErrorMsg("Failed to load Google Maps script.");
    document.head.appendChild(script);
  }, [API_KEY]);

  useEffect(() => {
    if (!navigator?.geolocation) {
      setErrorMsg("Geolocation not supported.");
      setLocation(DEFAULT_CENTER);
      return;
    }
    
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setErrorMsg("Unable to access location. Showing default area.");
        setLocation(DEFAULT_CENTER);
      },
      { timeout: 10000 }
    );
    
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!location) return;
    
    let cancelled = false;
    (async () => {
      try {
        const taxiList = await taxiService.getTaxis();
        if (cancelled) return;
        setTaxis(taxiList);
      } catch (error) {
        console.error("Failed to load taxis:", error);
      }
    })();
    
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    if (!mapsLoaded || !location || !containerRef.current) return;
    
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: location,
        zoom: 13,
        styles: [
          {
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{ color: "#f5f5f5" }]
          }
        ]
      });
      
      new window.google.maps.Marker({
        position: location,
        map: mapRef.current,
        title: "You",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff"
        }
      });
    } else {
      mapRef.current.setCenter(location);
    }
    
    // Clear existing taxi markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Add taxi markers
    taxis.forEach(taxi => {
      const marker = new window.google.maps.Marker({
        position: { lat: Number(taxi.lat), lng: Number(taxi.lng) },
        map: mapRef.current,
        title: taxi.name || "Taxi",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#ffffff"
        }
      });
      markersRef.current.push(marker);
    });
  }, [mapsLoaded, location, taxis]);

  const recenterMap = () => {
    if (mapRef.current && location) {
      mapRef.current.setCenter(location);
    }
  };

  const zoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 13;
      mapRef.current.setZoom(currentZoom + 1);
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() || 13;
      mapRef.current.setZoom(currentZoom - 1);
    }
  };

  return (
    <div className="flex-1 relative">
      {errorMsg && (
        <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg z-10">
          {errorMsg}
        </div>
      )}
      
      <div
        ref={containerRef}
        className="w-full h-full map-container"
        style={{ minHeight: "400px" }}
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:shadow-xl transition-shadow"
          onClick={recenterMap}
        >
          <i className="fas fa-location-arrow text-gray-600"></i>
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:shadow-xl transition-shadow"
          onClick={zoomIn}
        >
          <i className="fas fa-plus text-gray-600"></i>
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:shadow-xl transition-shadow"
          onClick={zoomOut}
        >
          <i className="fas fa-minus text-gray-600"></i>
        </Button>
      </div>

      {/* Location Status */}
      <div className="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-full shadow-lg">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
          <span className="text-gray-700">Live location active</span>
        </div>
      </div>
    </div>
  );
}
