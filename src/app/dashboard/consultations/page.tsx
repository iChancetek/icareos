
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, FileText, ExternalLink, Loader2 } from 'lucide-react';
import type { Consultation } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';


export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserConsultations } = useAuth();

  useEffect(() => {
    async function loadConsultations() {
      setIsLoading(true);
      const userConsultations = await getUserConsultations();
      setConsultations(userConsultations);
      setIsLoading(false);
    }
    
    loadConsultations();
  }, [getUserConsultations]);

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
        <Card className="text-center py-12 shadow-lg bg-card/80">
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
              <Card key={consultation.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card/80">
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
                      {'Summary not yet available.'}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href={`/dashboard/consultations/${consultation.id}`} passHref className="w-full">
                    <Button variant="outline" className="w-full shadow-sm hover:shadow-md">
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
