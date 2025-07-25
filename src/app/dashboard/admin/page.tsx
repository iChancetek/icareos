
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, ShieldCheck, Users, FileText, MoreHorizontal, UserPlus, Edit, KeyRound, Trash2 } from 'lucide-react';
import type { User } from '@/contexts/AuthContext';
import type { IScribe } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Extend IScribe type to include userName for the admin view
interface AdminIScribe extends IScribe {
    userName?: string;
}

type EditUserForm = {
    username: string;
    role: User['role'];
    accountStatus: User['accountStatus'];
};


function AdminDashboard() {
    const { user, getAllUsers, getAllIScribes, updateUserByAdmin, deleteUserByAdmin, isLoading: authIsLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allIScribes, setAllIScribes] = useState<AdminIScribe[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    // State for the Create User Dialog
    const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
      fullName: '',
      username: '',
      email: '',
      role: 'user',
      password: ''
    });

    // State for the Delete User Dialog
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);

    // State for Edit User Dialog
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [editUserForm, setEditUserForm] = useState<EditUserForm>({ username: '', role: 'user', accountStatus: 'active' });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const fetchAdminData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [users, iscribes] = await Promise.all([
                getAllUsers(),
                getAllIScribes()
            ]);

            const userMap = new Map(users.map(u => [u.uid, u.displayName]));
            const iscribesWithUserNames = iscribes.map(c => ({
                ...c,
                userName: userMap.get(c.userId) || 'Unknown User'
            }));
            
            setAllUsers(users);
            setAllIScribes(iscribesWithUserNames);

        } catch (error) {
            console.error("Error fetching admin data:", error);
             toast({
                title: "Error Fetching Data",
                description: "Could not retrieve administrator data from the server.",
                variant: "destructive"
            });
        } finally {
            setIsLoadingData(false);
        }
    }, [getAllUsers, getAllIScribes, toast]);

    useEffect(() => {
        if (authIsLoading) return;
        if (!user || user.role !== 'admin') {
            router.replace('/dashboard/iscribes');
            return;
        }

        fetchAdminData();
    }, [user, authIsLoading, router, fetchAdminData]);

    const handleOpenEditDialog = (targetUser: User) => {
        setUserToEdit(targetUser);
        setEditUserForm({
            username: targetUser.username || '',
            role: targetUser.role,
            accountStatus: targetUser.accountStatus || 'active',
        });
    };
    
    const handleSaveUserEdit = async () => {
        if (!userToEdit) return;
        setIsSavingEdit(true);

        const updatePayload: Partial<User> = {
            username: editUserForm.username,
            role: editUserForm.role,
            accountStatus: editUserForm.accountStatus,
        };

        const success = await updateUserByAdmin(userToEdit.uid, updatePayload);

        if (success) {
            toast({
                title: "User Updated",
                description: `${userToEdit.displayName}'s profile has been updated.`,
            });
            await fetchAdminData(); // Refresh local data to show changes
            setUserToEdit(null);
        } else {
            toast({
                title: "Update Failed",
                description: `Could not update ${userToEdit.displayName}'s profile. Please try again.`,
                variant: "destructive",
            });
        }
        setIsSavingEdit(false);
    };
    
    const handleCreateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder for actual user creation logic
        console.log("Admin Panel: Attempting to create user with data:", newUserForm);
        toast({
            title: "Feature In Development",
            description: "User creation requires back-end integration, which is not yet implemented.",
            variant: "default",
            duration: 6000
        });
        setIsCreateUserDialogOpen(false);
        // Reset form after submission
        setNewUserForm({ fullName: '', username: '', email: '', role: 'user', password: '' });
    };
    
    const handlePasswordReset = (targetUser: User) => {
        console.log("Admin Panel: Attempting to reset password for user:", targetUser.email);
        toast({
            title: "Feature In Development",
            description: "Password reset requires back-end integration.",
            variant: "default",
            duration: 6000
        });
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeletingUser(true);
        
        const result = await deleteUserByAdmin(userToDelete.uid);

        if (result.success) {
            toast({
                title: "User Deleted",
                description: result.message || `The account for ${userToDelete.displayName} has been permanently deleted.`,
            });
            await fetchAdminData(); // Refresh the user list
        } else {
            toast({
                title: "Deletion Failed",
                description: result.message || "An unknown error occurred. Please try again.",
                variant: "destructive",
            });
        }

        setIsDeletingUser(false);
        setUserToDelete(null);
    };


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
        <div className="container mx-auto py-8 px-4 md:px-0">
            <header className="mb-8">
                <h1 className="text-4xl font-bold flex items-center gap-3"><ShieldCheck className="h-10 w-10 text-primary" /> Admin Panel</h1>
                <p className="text-lg text-muted-foreground">Oversee users and iscribes across the platform.</p>
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
                        <CardTitle className="text-sm font-medium">Total iScribes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allIScribes.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="iscribes">iScribes</TabsTrigger>
                    </TabsList>
                    <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="shadow-sm">
                                <UserPlus className="mr-2 h-4 w-4" /> Create User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleCreateUserSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Create New User</DialogTitle>
                                    <DialogDescription>
                                        Manually create a new user account. An email with a temporary password will be sent.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="fullName" className="text-right">Full Name</Label>
                                        <Input id="fullName" value={newUserForm.fullName} onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="username" className="text-right">Username</Label>
                                        <Input id="username" value={newUserForm.username} onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input id="email" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})} className="col-span-3" required />
                                    </div>
                                     <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="password" className="text-right">Password</Label>
                                        <Input id="password" type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} className="col-span-3" placeholder="Temporary password" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="role" className="text-right">Role</Label>
                                         <Select
                                            value={newUserForm.role}
                                            onValueChange={(value) => setNewUserForm({...newUserForm, role: value as 'user' | 'admin'})}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">User</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Create User</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
                <TabsContent value="users">
                    <Card className="bg-card/80">
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
                                            <TableHead>Username</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined On</TableHead>
                                            <TableHead>Last Login</TableHead>
                                            <TableHead><span className="sr-only">Actions</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allUsers.map((u) => (
                                            <TableRow key={u.uid}>
                                                <TableCell className="font-medium">{u.displayName}</TableCell>
                                                <TableCell>{u.username}</TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                                                        {u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                     <Badge variant={u.accountStatus === 'active' ? 'default' : 'outline'} className="capitalize">
                                                        {u.accountStatus || 'active'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{u.createdAt ? format(u.createdAt, 'PPP') : 'N/A'}</TableCell>
                                                <TableCell>{u.lastLogin ? format(u.lastLogin, 'PPP p') : 'Never'}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user?.uid === u.uid}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Toggle menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleOpenEditDialog(u)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit User
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handlePasswordReset(u)}>
                                                                 <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(u)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="iscribes">
                     <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle>All iScribes</CardTitle>
                            <CardDescription>Directory of all recorded iscribes.</CardDescription>
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
                                        {allIScribes.map((c) => (
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
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account for 
                            <span className="font-bold"> {userToDelete?.displayName}</span> and all associated data. This action is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-destructive hover:bg-destructive/90">
                            {isDeletingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User: {userToEdit?.displayName}</DialogTitle>
                        <DialogDescription>
                            Modify the user's username, role, and account status.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Email</Label>
                            <Input value={userToEdit?.email || ''} readOnly className="col-span-3 bg-muted/50" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username-edit" className="text-right">Username</Label>
                             <Input 
                                id="username-edit"
                                value={editUserForm.username}
                                onChange={(e) => setEditUserForm(prev => ({...prev, username: e.target.value}))}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role-edit" className="text-right">Role</Label>
                            <Select
                                value={editUserForm.role}
                                onValueChange={(value) => setEditUserForm(prev => ({ ...prev, role: value as User['role'] }))}
                            >
                                <SelectTrigger id="role-edit" className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status-edit" className="text-right">Status</Label>
                            <Select
                                value={editUserForm.accountStatus}
                                onValueChange={(value) => setEditUserForm(prev => ({ ...prev, accountStatus: value as User['accountStatus'] }))}
                            >
                                <SelectTrigger id="status-edit" className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
                        <Button onClick={handleSaveUserEdit} disabled={isSavingEdit}>
                            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
        router.replace('/dashboard/iscribes');
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <p>You are not authorized to view this page. Redirecting...</p>
                <Loader2 className="ml-4 h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <AdminDashboard />;
}
