'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * One-time admin bootstrap page.
 * Visit /bootstrap-admin while logged in as icareos@ichancetek.com.
 * After clicking the button, log out and log back in.
 * 
 * This page is intentionally NOT linked in the nav and should be removed
 * after initial admin setup is confirmed.
 */
export default function BootstrapAdminPage() {
    const { user, firebaseUser } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleBootstrap = async () => {
        if (!firebaseUser) return;
        setStatus('loading');

        try {
            const res = await fetch('/api/admin/bootstrap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: firebaseUser.uid,
                    secret: 'icareos-bootstrap-2026',
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStatus('success');
                setMessage('✅ Admin role granted! Please log out and log back in to access the admin dashboard.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Unknown error.');
            }
        } catch (e: any) {
            setStatus('error');
            setMessage(e.message);
        }
    };

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">You must be logged in to use this page.</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
            <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-lg space-y-4">
                <h1 className="text-xl font-bold">Admin Bootstrap</h1>
                <p className="text-sm text-muted-foreground">
                    Logged in as: <strong>{user.email}</strong>
                    <br />
                    UID: <code className="text-xs bg-muted px-1 rounded">{firebaseUser?.uid}</code>
                    <br />
                    Current role: <strong>{user.role}</strong>
                </p>

                {status === 'idle' || status === 'loading' ? (
                    <button
                        onClick={handleBootstrap}
                        disabled={status === 'loading'}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
                    >
                        {status === 'loading' ? 'Granting Admin Role...' : 'Grant Admin Role to This Account'}
                    </button>
                ) : (
                    <div className={`rounded-xl p-4 text-sm ${status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {message}
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    After granting admin, log out and log back in. From then on, use the Admin Dashboard to manage roles.
                </p>
            </div>
        </div>
    );
}
