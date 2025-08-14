import { useState, useEffect } from "react";
import { authService } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapPanel from "@/components/map-panel";
import TaxiList from "@/components/taxi-list";
import ChatPanel from "@/components/chat-panel";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  user: any;
  userRole: any;
  onSignOut: () => void;
}

export default function Dashboard({ user, userRole, onSignOut }: DashboardProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!navigator?.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (error) => {
        console.error("Geolocation error:", error);
        // Fallback to Bangalore coordinates
        setUserLocation({ lat: 12.9716, lng: 77.5946 });
      },
      { timeout: 10000 }
    );
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      onSignOut();
      toast({
        title: "Success",
        description: "Logged out successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-taxi text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Riderupee</h1>
              <p className="text-xs text-gray-600">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-secondary text-white text-sm rounded-full capitalize">
              {userRole?.role === 'owner' ? 'Taxi Owner' : 'Passenger'}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <i className="fas fa-sign-out-alt text-gray-600"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
        {/* Map Panel */}
        <MapPanel currentUser={user} />

        {/* Side Panel */}
        <div className="w-full lg:w-96 bg-white border-l">
          <Tabs defaultValue="book" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="book" className="text-sm">
                <i className="fas fa-search mr-2"></i>Book Ride
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-sm" onClick={() => setIsChatOpen(true)}>
                <i className="fas fa-comments mr-2"></i>Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="book" className="h-full overflow-y-auto">
              <TaxiList userLocation={userLocation} />
            </TabsContent>

            <TabsContent value="messages" className="h-full">
              <div className="p-4 text-center text-gray-500">
                <i className="fas fa-comments text-4xl mb-4"></i>
                <p>Click the Messages tab to open chat</p>
                <Button 
                  onClick={() => setIsChatOpen(true)}
                  className="mt-4"
                  variant="outline"
                >
                  Open Chat
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        user={user}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
