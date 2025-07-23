
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
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.3v2.84C4.02 20.94 7.7 23 12 23z" fill="#34A853"></path>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.3C1.42 8.84 1 10.36 1 12s.42 3.16 1.3 4.93l3.54-2.84z" fill="#FBBC05"></path>
        <path d="M12 5.16c1.63 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 4.02 3.06 2.3 5.93l3.54 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
        <path d="M1 1h22v22H1z" fill="none"></path>
    </svg>
);


export default function LoginPage() {
  const { login, signInWithGoogle, isLoading: authIsLoading } = useAuth();
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
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const success = await signInWithGoogle();
    setIsSubmitting(false);
    if(success) {
      toast({
          title: "Login Successful",
          description: "Welcome!",
      });
    }
  }

  const handleForgotPassword = () => {
    toast({
      title: "Forgot Password (Demo Feature)",
      description: "This is a demo. A real password reset requires backend email functionality which is not implemented. No email will be sent.",
      duration: 7000,
    });
  };

  const isLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/30 p-4 selection:bg-primary/20">
      <Card className="w-full max-w-md shadow-xl rounded-xl border border-primary/20 bg-card/95 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300 ease-in-out">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full p-5 bg-primary/10 shadow-lg shadow-primary/20">
              <Stethoscope className="h-16 w-16 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">MediScribe</CardTitle>
          <CardDescription>Powered by Generative AI to Enhance Patient Care</CardDescription>
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

          <div className="relative my-6">
              <Separator />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
                  <span className="bg-card px-2 text-sm text-muted-foreground">OR</span>
              </div>
          </div>
        
          <Button
            variant="outline"
            className="w-full text-lg py-6"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
              {isLoading ? <Loader2 className="animate-spin" /> : <> <GoogleIcon/> Sign in with Google </>}
          </Button>
          
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className={cn("font-semibold text-primary hover:text-primary/80 transition-colors duration-150 hover:underline", isLoading && "pointer-events-none opacity-50")}>
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        Powered by ChanceTEK LLC
      </footer>
    </div>
  );
}
