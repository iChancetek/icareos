

"use client";

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, FileText, ExternalLink, Loader2, Languages, Mic } from 'lucide-react';
import type { IScribe, Translation } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

type CombinedRecording = (IScribe | Translation) & { type: 'iscribe' | 'translation' };

export default function RecordingsPage() {
  const [iscribes, setIScribes] = useState<IScribe[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserIScribes, getUserTranslations } = useAuth();

  useEffect(() => {
    async function loadRecordings() {
      setIsLoading(true);
      const [userIScribes, userTranslations] = await Promise.all([
        getUserIScribes(),
        getUserTranslations()
      ]);
      setIScribes(userIScribes);
      setTranslations(userTranslations);
      setIsLoading(false);
    }
    
    loadRecordings();
  }, [getUserIScribes, getUserTranslations]);

  const allRecordings = useMemo<CombinedRecording[]>(() => {
    const combined = [
      ...iscribes.map(item => ({ ...item, type: 'iscribe' as const })),
      ...translations.map(item => ({ ...item, type: 'translation' as const }))
    ];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [iscribes, translations]);


  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const renderEmptyState = (title: string, description: string, buttonText: string, link: string, Icon: React.ElementType) => (
     <Card className="text-center py-12 shadow-lg bg-card/80 mt-6">
        <CardHeader>
            <div className="mx-auto bg-accent/10 rounded-full p-4 w-fit mb-4 shadow-inner">
                <Icon className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              {description}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Link href={link} passHref>
            <Button size="lg" className="shadow-md hover:shadow-lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                {buttonText}
            </Button>
            </Link>
        </CardContent>
    </Card>
  )

  const renderIScribeCard = (item: IScribe) => (
    <Card key={item.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80">
        <CardHeader>
            <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{item.patientName}</CardTitle>
             <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'} className="capitalize">{item.status}</Badge>
            </div>
            <CardDescription>
            {format(new Date(item.date), "PPP p")}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-3">
            {item.summary || 'No summary available.'}
            </p>
        </CardContent>
        <CardFooter>
            <Link href={`/dashboard/iscribe/${item.id}`} passHref className="w-full">
            <Button variant="outline" className="w-full shadow-sm hover:shadow-md">
                View Details
                <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            </Link>
        </CardFooter>
    </Card>
  );

  const renderTranslationCard = (item: Translation) => (
     <Card key={item.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80">
        <CardHeader>
            <div className="flex justify-between items-start">
            <CardTitle className="text-xl flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                Voice Translation
            </CardTitle>
            </div>
            <CardDescription>
            {format(new Date(item.date), "PPP p")}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
             <p className="text-sm text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground">Original ({item.sourceLanguage}): </span>
                {item.sourceTranscript}
            </p>
             <p className="text-sm text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground">Translation ({item.targetLanguage}): </span>
                {item.translatedText}
            </p>
        </CardContent>
        <CardFooter>
            <Link href={`/dashboard/recordings/translation/${item.id}`} passHref className="w-full">
            <Button variant="outline" className="w-full shadow-sm hover:shadow-md">
                View Details
                <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            </Link>
        </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Recordings</h1>
            <p className="text-muted-foreground">Manage your iScribes and saved voice translations.</p>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px] mb-6">
            <TabsTrigger value="all">All ({allRecordings.length})</TabsTrigger>
            <TabsTrigger value="iscribes">iScribes ({iscribes.length})</TabsTrigger>
            <TabsTrigger value="translations">Translations ({translations.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
            {allRecordings.length === 0 ? (
                 renderEmptyState(
                    "No Recordings Yet",
                    "Create an iScribe or save a Voice Translation to see it here.",
                    "Record New iScribe",
                    "/dashboard/iscribe/new",
                    FileText
                 )
            ) : (
                <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {allRecordings.map((item) =>
                        item.type === 'iscribe' ? renderIScribeCard(item) : renderTranslationCard(item)
                    )}
                    </div>
                </ScrollArea>
            )}
        </TabsContent>
        <TabsContent value="iscribes">
            {iscribes.length === 0 ? (
                 renderEmptyState(
                    "No iScribes Yet",
                    "Get started by creating your first iScribe.",
                    "Record New iScribe",
                    "/dashboard/iscribe/new",
                    Mic
                 )
            ) : (
                 <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {iscribes.map(renderIScribeCard)}
                    </div>
                </ScrollArea>
            )}
        </TabsContent>
        <TabsContent value="translations">
            {translations.length === 0 ? (
                 renderEmptyState(
                    "No Saved Translations Yet",
                    "Use the Voice Translator and save the session to see it here.",
                    "Open Voice Translator",
                    "#", // This would ideally trigger the dialog
                    Languages
                 )
            ) : (
                 <ScrollArea className="h-[calc(100vh-20rem)]">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {translations.map(renderTranslationCard)}
                    </div>
                </ScrollArea>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
