
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState, type FormEvent } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';


export default function LoginPage() {
  const { login, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast({
        title: "Login Failed",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again or sign up.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "Password Reset (Demo)",
      description: "In a full application, an email with a reset link would be sent. This functionality is a placeholder here.",
      duration: 7000, // Increased duration for better visibility
    });
  };

  const isLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/30 p-4 selection:bg-primary/20">
      <Card className="w-full max-w-md shadow-xl rounded-xl border border-primary/20 bg-card/95 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300 ease-in-out">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full p-5 bg-primary/10 shadow-lg shadow-primary/20">
              <Stethoscope className="h-16 w-16 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">MediSummarize</CardTitle>
          <CardDescription>Login to access your MediSummarize dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-card/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/80 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm text-primary hover:text-primary/80 transition-colors duration-150 hover:underline"
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                >
                  Forgot password?
                </Button>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-card/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/80 transition-all duration-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full text-lg py-6 font-semibold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transform hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ease-in-out focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none shadow-md hover:shadow-lg hover:shadow-primary/20"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Login'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={cn("font-semibold text-primary hover:text-primary/80 transition-colors duration-150 hover:underline", isLoading && "pointer-events-none opacity-50")}>
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
