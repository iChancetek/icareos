
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Eye, EyeOff, Loader2, User as UserIcon } from 'lucide-react';
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


export default function SignUpPage() {
  const { signup, signInWithGoogle, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: "Signup Failed",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Signup Failed",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (!email || !password) {
       toast({
        title: "Signup Failed",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    const success = await signup(email, password, displayName); 
    setIsSubmitting(false);

    if (success) {
      toast({
        title: "Signup Successful",
        description: "Welcome to MediScribe! You are now being redirected.",
      });
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const success = await signInWithGoogle();
    setIsSubmitting(false);
    if(success) {
      toast({
          title: "Signup Successful",
          description: "Welcome! Your profile is created.",
      });
    }
  }

  const isLoading = authIsLoading || isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Stethoscope className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">MediScribe</CardTitle>
          <CardDescription>Create your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <Input 
                  id="displayName" 
                  type="text" 
                  placeholder="e.g., Dr. Jane Doe" 
                  required 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  className="bg-background/70 pl-10" 
                />
                <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
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
                className="bg-background/70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-background/70"
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
               <div className="relative">
                <Input 
                  id="confirm-password" 
                  type={showConfirmPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-background/70"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
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
              {isLoading ? <Loader2 className="animate-spin" /> : <> <GoogleIcon/> Continue with Google </>}
          </Button>

          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className={cn("font-semibold text-primary hover:underline", isLoading && "pointer-events-none opacity-50")}>
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
