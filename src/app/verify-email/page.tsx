"use client";

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailPage() {
    const { firebaseUser, resendVerificationEmail, logout } = useAuth();
    const { toast } = useToast();
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const handleResend = async () => {
        setIsResending(true);
        const success = await resendVerificationEmail();
        setIsResending(false);

        if (success) {
            toast({
                title: "Verification Email Sent",
                description: "Please check your inbox (and spam folder).",
            });
        } else {
            toast({
                title: "Error",
                description: "Could not send verification email. Please try again later.",
                variant: "destructive",
            });
        }
    };

    const checkStatus = async () => {
        if (!firebaseUser) return;
        setIsChecking(true);
        await firebaseUser.reload();
        setIsChecking(false);

        // After reload, the AuthContext listener generally picks up changes naturally, 
        // or the page refreshes/redirects via the useEffect.
        if (firebaseUser.emailVerified) {
            toast({
                title: "Email Verified!",
                description: "Redirecting you to the dashboard...",
            });
            window.location.href = '/dashboard/iscribe';
        } else {
            toast({
                title: "Not Verified Yet",
                description: "We couldn't verify your email yet. Please ensure you clicked the link.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                    <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>

                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Check your email
                </h2>

                <p className="text-muted-foreground mt-4">
                    We've sent a verification link to <br />
                    <span className="font-medium text-foreground">{firebaseUser?.email}</span>
                </p>

                <p className="text-sm text-muted-foreground mt-2 mb-8">
                    Please verify your email address to access your completely secure dashboard.
                </p>

                <div className="space-y-4">
                    <Button
                        className="w-full relative gap-2"
                        size="lg"
                        onClick={checkStatus}
                        disabled={isChecking}
                    >
                        {isChecking && <RefreshCw className="w-4 h-4 animate-spin absolute left-4" />}
                        I've Verified My Email
                        <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleResend}
                        disabled={isResending}
                    >
                        <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                        Resend Verification Link
                    </Button>

                    <div className="pt-4 border-t border-border/50 mt-6">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground gap-2 w-full"
                            onClick={logout}
                        >
                            <LogOut className="w-4 h-4" />
                            Sign in with a different account
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
