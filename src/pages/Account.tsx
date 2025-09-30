import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Moon, Sun, ArrowLeft, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Account = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    }
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast({
      title: `${newDarkMode ? "Dark" : "Light"} mode enabled`,
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  const userInitial = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/app")}
          className="hover:bg-primary/10 hover:text-primary transition-smooth"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="shadow-premium tech-border">
          <CardHeader>
            <CardTitle className="text-2xl">Account Settings</CardTitle>
            <CardDescription>Manage your account and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4 p-4 rounded-xl glass-effect">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl glass-effect">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleDarkMode}
                  className="hover:bg-primary/10 hover:text-primary transition-smooth"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="space-y-4 p-4 rounded-xl glass-effect">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Change Password</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="w-full gradient-primary text-primary-foreground border-0 shadow-primary hover:shadow-glow transition-smooth"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <Button 
                variant="destructive" 
                className="w-full shadow-md hover:shadow-lg transition-smooth" 
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
