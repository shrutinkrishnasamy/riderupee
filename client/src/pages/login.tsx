import { useState } from "react";
import { authService, firebaseInitError } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onAuthChanged: () => void;
}

export default function Login({ onAuthChanged }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "owner">("user");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const disabled = !!firebaseInitError;

  const handleLogin = async () => {
    if (disabled) {
      toast({
        title: "Error",
        description: "Firebase not initialized. Check configuration.",
        variant: "destructive"
      });
      return;
    }
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please provide email and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await authService.signIn(email, password);
      onAuthChanged();
      toast({
        title: "Success",
        description: "Logged in successfully"
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error?.message || "Login failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (disabled) {
      toast({
        title: "Error",
        description: "Firebase not initialized. Check configuration.",
        variant: "destructive"
      });
      return;
    }
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please provide email and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await authService.signUp(email, password, role);
      onAuthChanged();
      toast({
        title: "Success",
        description: "Account created successfully"
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error?.message || "Registration failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <Card className="glassmorphism w-full max-w-md shadow-2xl animate-slide-up">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <i className="fas fa-taxi text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Riderupee</h1>
            <p className="text-gray-600">Your trusted ride companion</p>
          </div>

          {firebaseInitError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
              Firebase initialization error. Check your configuration.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                Role
              </Label>
              <Select value={role} onValueChange={(value: "user" | "owner") => setRole(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Passenger</SelectItem>
                  <SelectItem value="owner">Taxi Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleLogin}
                disabled={loading || disabled}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Sign In
              </Button>
              <Button
                onClick={handleRegister}
                disabled={loading || disabled}
                variant="secondary"
                className="flex-1"
              >
                Register
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <i className="fas fa-shield-alt text-secondary mr-1"></i>
              Secured with Firebase Authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
