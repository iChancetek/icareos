
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, ShieldCheck, Users, FileText } from 'lucide-react';
import type { User } from '@/contexts/AuthContext';
import type { Consultation } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';

// Extend Consultation type to include userName for the admin view
interface AdminConsultation extends Consultation {
    userName?: string;
}

function AdminDashboard() {
    const { user, getAllUsers, getAllConsultations, isLoading: authIsLoading } = useAuth();
    const router = useRouter();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allConsultations, setAllConsultations] = useState<AdminConsultation[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (authIsLoading) return;
        if (!user || user.role !== 'admin') {
            router.replace('/dashboard/consultations');
            return;
        }

        async function fetchData() {
            setIsLoadingData(true);
            try {
                const [users, consultations] = await Promise.all([
                    getAllUsers(),
                    getAllConsultations()
                ]);

                // Map user names to consultations
                const userMap = new Map(users.map(u => [u.uid, u.displayName]));
                const consultationsWithUserNames = consultations.map(c => ({
                    ...c,
                    userName: userMap.get(c.userId) || 'Unknown User'
                }));
                
                setAllUsers(users);
                setAllConsultations(consultationsWithUserNames);

            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setIsLoadingData(false);
            }
        }

        fetchData();

    }, [user, authIsLoading, router, getAllUsers, getAllConsultations]);

    if (authIsLoading || isLoadingData) {
        return (
            <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (user?.role !== 'admin') {
        return null; // Redirect is happening
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-0 text-white">
            <header className="mb-8">
                <h1 className="text-4xl font-bold flex items-center gap-3"><ShieldCheck className="h-10 w-10 text-primary" /> Admin Panel</h1>
                <p className="text-lg text-gray-400">Oversee users and consultations across the platform.</p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allUsers.length}</div>
                    </CardContent>
                </Card>
                 <Card className="bg-card/80">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Consultations</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allConsultations.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="consultations">Consultations</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <Card className="bg-card/80 mt-4">
                        <CardHeader>
                            <CardTitle>All Users</CardTitle>
                            <CardDescription>Directory of all registered users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[50vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Display Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined On</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allUsers.map((u) => (
                                            <TableRow key={u.uid}>
                                                <TableCell className="font-medium">{u.displayName}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{u.createdAt ? format(u.createdAt, 'PPP') : 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="consultations">
                     <Card className="bg-card/80 mt-4">
                        <CardHeader>
                            <CardTitle>All Consultations</CardTitle>
                            <CardDescription>Directory of all recorded consultations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[50vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Patient Name</TableHead>
                                            <TableHead>Recorded by</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allConsultations.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.patientName}</TableCell>
                                                <TableCell>{c.userName}</TableCell>
                                                <TableCell>{format(new Date(c.date), 'PPP p')}</TableCell>
                                                 <TableCell>
                                                    <Badge className="capitalize">{c.status}</Badge>
                                                 </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


// Wrapper to ensure role check happens before rendering the page.
export default function AdminPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        router.replace('/login');
        return null;
    }

    if (user.role !== 'admin') {
        router.replace('/dashboard/consultations');
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <p className="text-white">You are not authorized to view this page. Redirecting...</p>
                <Loader2 className="ml-4 h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <AdminDashboard />;
}
