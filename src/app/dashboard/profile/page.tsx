
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
  const { user, updateUserProfile, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || 'No email associated');
      setPhotoPreview(user.photoURL || null);
    }
  }, [user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    const success = await updateUserProfile({ displayName: displayName.trim() });
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Profile Updated',
        description: 'Your display name has been successfully updated.',
      });
    } else {
      // Revert local state if API call fails
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
        setIsSaving(true);
        // Note: For production, you'd upload to Firebase Storage and get a URL.
        // For this implementation, we can store the data URI directly in Firestore if desired,
        // though it's not efficient for large images.
        const success = await updateUserProfile({ photoURL: dataUri });
        setIsSaving(false);
        if (success) {
          toast({
            title: 'Profile Photo Updated',
            description: 'Your new photo has been saved.',
          });
        } else {
          // Revert preview if save fails
          setPhotoPreview(user?.photoURL || null);
        }
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      };
      reader.readAsDataURL(file);
    }
  };
  
  const isLoadingOverall = authIsLoading || isSaving;
  // Use photoPreview for immediate UI update, fallback to user object
  const avatarSrc = photoPreview || user?.photoURL || `https://placehold.co/100x100.png`;

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
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    type="button"
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoadingOverall}
                    className="shadow-sm"
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    Change Photo
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/png, image/jpeg, image/gif" 
                    className="hidden"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground text-center sm:text-left">Max 2MB. Recommended: Square JPG or PNG.</p>
                </div>
              </div>

              <Separator />

              {/* Display Name and Email Section */}
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
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
          </form>
        </CardContent>
         <CardFooter className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground w-full">
                Changes to your profile will be reflected across the application.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
