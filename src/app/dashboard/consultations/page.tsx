
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, FileText, ExternalLink, Loader2 } from 'lucide-react';
import type { Consultation } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConsultationsFromStorage = () => {
      setIsLoading(true);
      const loaded: Consultation[] = [];
      const keys = Object.keys(localStorage);
      const consultationIds: string[] = [];

      keys.forEach(key => {
        if (key.startsWith('consultation-') && key.endsWith('-patientName')) {
          const id = key.replace('consultation-', '').replace('-patientName', '');
          if (!consultationIds.includes(id)) {
            consultationIds.push(id);
          }
        }
      });

      consultationIds.forEach(id => {
        const patientName = localStorage.getItem(`consultation-${id}-patientName`);
        const transcript = localStorage.getItem(`consultation-${id}-transcript`);
        const summary = localStorage.getItem(`consultation-${id}-summary`);
        const date = localStorage.getItem(`consultation-${id}-date`);
        const audioDataUri = localStorage.getItem(`consultation-${id}-audioDataUri`);
        const translatedTranscript = localStorage.getItem(`consultation-${id}-translatedTranscript`);
        const translatedTranscriptLanguage = localStorage.getItem(`consultation-${id}-translatedTranscriptLanguage`);
        const status = 'Completed'; 

        if (patientName && date) { 
          loaded.push({
            id,
            patientName,
            date,
            status: status as Consultation['status'],
            transcript: transcript || undefined,
            summary: summary || undefined,
            audioDataUri: audioDataUri || undefined,
            translatedTranscript: translatedTranscript || undefined,
            translatedTranscriptLanguage: translatedTranscriptLanguage || undefined,
          });
        }
      });

      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setConsultations(loaded);
      setIsLoading(false);
    };
    
    loadConsultationsFromStorage();
  }, []);

  const getStatusBadgeVariant = (status: Consultation['status']) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Transcribing':
      case 'Summarizing': return 'secondary';
      case 'Failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-15rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Consultations</h1>
          <p className="text-muted-foreground">View and manage your recorded medical consultations.</p>
        </div>
        <Link href="/dashboard/consultations/new" passHref>
          <Button size="lg" className="shadow-md hover:shadow-lg transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" />
            Start New Consultation
          </Button>
        </Link>
      </div>

      {consultations.length === 0 ? (
        <Card className="text-center py-12 shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-accent/10 rounded-full p-4 w-fit mb-4 shadow-inner">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">No Consultations Yet</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Start a new consultation to see your summaries here.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Link href="/dashboard/consultations/new" passHref>
              <Button size="lg" className="shadow-md hover:shadow-lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Record First Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]"> 
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{consultation.patientName}</CardTitle>
                     <Badge variant={getStatusBadgeVariant(consultation.status)} className="capitalize">{consultation.status}</Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(consultation.date), "PPP p")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {consultation.summary ? (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {consultation.summary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {consultation.status === 'Transcribing' ? 'Transcription in progress...' :
                       consultation.status === 'Summarizing' ? 'Summarization in progress...' :
                       consultation.status === 'Failed' ? 'Processing failed. Please try again.' :
                       'Summary not yet available.'}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href={`/dashboard/consultations/${consultation.id}`} passHref className="w-full">
                    <Button variant="outline" className="w-full shadow-sm hover:shadow-md" disabled={consultation.status !== 'Completed'}>
                      View Details
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
