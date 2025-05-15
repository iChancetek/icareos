
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react'; // Renamed to avoid conflict

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
           <div className="flex items-center gap-3">
            <SettingsIcon className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Application Settings</CardTitle>
              <CardDescription>Manage your application preferences.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 text-center py-10">
            <p className="text-muted-foreground">
              Settings page is currently under construction.
            </p>
            <p className="text-sm text-muted-foreground">
              Future options for theme customization, notification preferences, and other application-wide settings will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
