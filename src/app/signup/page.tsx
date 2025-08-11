
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Stethoscope } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState, type FormEvent } from 'react';
import { useToast } from "@/hooks/use-toast";

const GoogleIcon = () => (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      toast({
        title: "Signup Failed",
        description: "Please enter your full name and username.",
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
    try {
        const success = await signup(email, password, displayName, username); 
        if (success) {
            toast({
                title: "Signup Successful",
                description: "Welcome to MediScribe! You are now being redirected.",
            });
        }
    } catch(error: any) {
        let description = "An unknown error occurred during signup. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            description = "An account with this email address already exists.";
        } else if (error.code === 'auth/weak-password') {
            description = "The password is too weak. Please choose a stronger password.";
        } else if (error.message) {
            description = error.message;
        }
        toast({
            title: "Signup Failed",
            description: description,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    const success = await signInWithGoogle();
    setIsSubmitting(true);
    if(success) {
      toast({
          title: "Signup Successful",
          description: "Welcome! Your profile is created.",
      });
    } else {
        toast({
            title: "Google Sign-In Failed",
            description: "The sign-in process was not completed. Please try again.",
            variant: "destructive",
        });
    }
    setIsSubmitting(false);
  }

  const isLoading = authIsLoading || isSubmitting;

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center bg-blue-50 text-gray-800">
        <Stethoscope className="h-16 w-16 text-blue-600 mb-6" />
        <h1 className="text-5xl font-bold mb-4">Welcome to MediScribe</h1>
        <p className="text-lg text-gray-600 max-w-md">
          A modern AI companion for healthcare professionals—powered by voice, empathy, and innovation.
        </p>
      </div>
       <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
              Get Started
            </h2>
             <p className="mt-2 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </div>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="rounded-md -space-y-px">
                <div>
                    <Label htmlFor="displayName" className="sr-only">Full Name</Label>
                    <Input
                        id="displayName"
                        name="displayName"
                        type="text"
                        required
                        className="relative block w-full appearance-none rounded-none rounded-t-md px-3 py-2 sm:text-sm"
                        placeholder="Full Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <Label htmlFor="username" className="sr-only">Username</Label>
                    <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="relative block w-full appearance-none rounded-none px-3 py-2 sm:text-sm"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <Label htmlFor="email-address" className="sr-only">Email address</Label>
                    <Input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="relative block w-full appearance-none rounded-none px-3 py-2 sm:text-sm"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>
                <div className="relative">
                    <Label htmlFor="password" className="sr-only">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="relative block w-full appearance-none rounded-none px-3 py-2 sm:text-sm"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
                <div className="relative">
                    <Label htmlFor="confirm-password" className="sr-only">Confirm Password</Label>
                    <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        className="relative block w-full appearance-none rounded-none rounded-b-md px-3 py-2 sm:text-sm"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                    />
                     <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                    >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
            </div>

            <div>
              <Button
                type="submit"
                className="group relative flex w-full justify-center"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </Button>
            </div>
          </form>
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-background px-2 text-muted-foreground">OR</span>
                </div>
            </div>

            <div>
                <Button
                    variant="outline"
                    className="w-full justify-center flex items-center"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon /> Continue with Google</>}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
