
"use client";

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, UserCircle, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function ProfilePage() {
  const { user, updateUserDisplayName, updateUserPhotoURL, isLoading: authIsLoading, fetchUserProfile } = useAuth();
  const { toast } = useToast();
  
  // Local state for form inputs, initialized from user context or empty
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); // For immediate preview
  
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If user data is not yet available in context, try fetching it
    if (!user && !authIsLoading) {
      fetchUserProfile();
    }
  }, [user, authIsLoading, fetchUserProfile]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || 'No email associated');
      setPhotoPreview(user.photoURL || null); // Set preview from context user photo
    }
  }, [user]);

  const handleDisplayNameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    setIsSavingName(true);
    const success = await updateUserDisplayName(displayName.trim());
    setIsSavingName(false);

    if (success) {
      toast({
        title: 'Profile Updated',
        description: 'Your display name has been successfully updated.',
      });
    } else {
      toast({
        title: 'Update Failed',
        description: 'Could not update your display name. Please try again.',
        variant: 'destructive',
      });
      // Optionally revert local state if API call fails
      if(user) setDisplayName(user.displayName || '');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: 'File Too Large',
          description: 'Please select an image smaller than 2MB.',
          variant: 'destructive',
        });
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setPhotoPreview(dataUri); // Update preview immediately
        setIsSavingPhoto(true);
        const success = await updateUserPhotoURL(dataUri);
        setIsSavingPhoto(false);
        if (success) {
          toast({
            title: 'Profile Photo Updated',
            description: 'Your new photo has been saved.',
          });
        } else {
          toast({
            title: 'Photo Update Failed',
            description: 'Could not save your new photo. Please try again.',
            variant: 'destructive',
          });
          // Revert preview if save fails and user object exists
          setPhotoPreview(user?.photoURL || null);
        }
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      };
      reader.readAsDataURL(file);
    }
  };
  
  const isLoadingOverall = authIsLoading || isSavingName || isSavingPhoto;
  const avatarSrc = photoPreview || `https://placehold.co/100x100.png`; // Use photoPreview for immediate UI update


  if (authIsLoading && !user) {
     return <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
             <UserCircle className="h-10 w-10 text-primary sm:block hidden" />
            <div>
              <CardTitle className="text-3xl font-bold">User Profile</CardTitle>
              <CardDescription>View and manage your profile details and photo.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary/30 shadow-md">
              <AvatarImage src={avatarSrc} alt={displayName || "User's profile picture"} data-ai-hint="profile photo" />
              <AvatarFallback className="text-3xl">
                {displayName ? displayName.charAt(0).toUpperCase() : <UserCircle size={48} />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center sm:items-start gap-2 mt-2 sm:mt-0">
              <h3 className="text-lg font-medium text-foreground">Profile Picture</h3>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingOverall}
                className="shadow-sm"
              >
                {isSavingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                Change Photo
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/gif" 
                className="hidden"
                disabled={isSavingPhoto}
              />
              <p className="text-xs text-muted-foreground text-center sm:text-left">Max 2MB. Recommended: Square JPG or PNG.</p>
            </div>
          </div>

          <Separator />

          {/* Display Name and Email Section */}
          <form onSubmit={handleDisplayNameSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoadingOverall}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                readOnly // Email is not editable
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Your email address cannot be changed here.</p>
            </div>
            <Button type="submit" className="w-full sm:w-auto shadow-md" disabled={isLoadingOverall || !displayName.trim()}>
              {isSavingName ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Display Name
            </Button>
          </form>
        </CardContent>
         <CardFooter className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground w-full">
                Changes to your display name and photo will be reflected across the application (after refresh or next login for header).
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
