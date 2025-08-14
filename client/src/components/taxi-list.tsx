import { useEffect, useState } from "react";
import { taxiService, TaxiData } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TaxiListProps {
  userLocation: { lat: number; lng: number } | null;
}

export default function TaxiList({ userLocation }: TaxiListProps) {
  const [taxis, setTaxis] = useState<TaxiData[]>([]);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTaxis = async () => {
      try {
        const taxiList = await taxiService.getTaxis();
        setTaxis(taxiList);
      } catch (error) {
        console.error("Failed to load taxis:", error);
      }
    };

    loadTaxis();
  }, []);

  const calculateDistance = (taxi: TaxiData): number => {
    if (!userLocation) return 0;
    
    const R = 6371; // Earth's radius in km
    const dLat = (Number(taxi.lat) - userLocation.lat) * Math.PI / 180;
    const dLng = (Number(taxi.lng) - userLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(Number(taxi.lat) * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleBookNow = () => {
    setLoading(true);
    // Simulate booking process
    setTimeout(() => {
      setLoading(false);
      alert("Booking request sent!");
    }, 2000);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label htmlFor="pickup" className="block text-sm font-medium text-gray-700 mb-1">
          Pickup Location
        </Label>
        <div className="relative">
          <Input
            id="pickup"
            type="text"
            placeholder="Enter pickup location"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className="pl-10"
          />
          <i className="fas fa-circle absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary"></i>
        </div>
      </div>

      <div>
        <Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination
        </Label>
        <div className="relative">
          <Input
            id="destination"
            type="text"
            placeholder="Where to?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="pl-10"
          />
          <i className="fas fa-map-marker-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-danger"></i>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Available Taxis Nearby</h3>
        
        <div className="space-y-2">
          {taxis.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-taxi text-4xl mb-2"></i>
              <p>No taxis available</p>
              <p className="text-sm">Please check back later</p>
            </div>
          ) : (
            taxis.map((taxi) => {
              const distance = calculateDistance(taxi);
              const estimatedPrice = Math.round(120 + distance * 15);
              const estimatedTime = Math.round(distance * 2 + 4);
              
              return (
                <div key={taxi.id} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <i className="fas fa-taxi text-white"></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{taxi.name}</p>
                        <p className="text-sm text-gray-600">{distance.toFixed(1)} km away</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-800">₹{estimatedPrice}</p>
                      <p className="text-xs text-gray-600">{estimatedTime} min</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Button
        onClick={handleBookNow}
        disabled={loading || !pickup || !destination}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {loading ? (
          <i className="fas fa-spinner fa-spin mr-2"></i>
        ) : (
          <i className="fas fa-car mr-2"></i>
        )}
        Book Now
      </Button>
    </div>
  );
}
