"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, FileText, ExternalLink } from 'lucide-react';
import type { Consultation } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Mock data - replace with API call in a real app
const mockConsultations: Consultation[] = [
  {
    id: '1',
    patientName: 'John Doe',
    date: new Date(2023, 10, 15, 10, 30).toISOString(),
    status: 'Completed',
    summary: 'Patient presented with flu-like symptoms. Prescribed rest and fluids.',
    transcript: 'Doctor: How are you feeling today, John? John: Not so great, doc...'
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    date: new Date(2023, 10, 16, 14, 0).toISOString(),
    status: 'Completed',
    summary: 'Routine check-up. All vitals normal. Discussed diet and exercise.',
    transcript: 'Doctor: Hello Jane, welcome. Any concerns today? Jane: No, just here for my check-up...'
  },
  {
    id: '3',
    patientName: 'Robert Brown',
    date: new Date().toISOString(), // Today
    status: 'Summarizing',
  },
];


export default function ConsultationsPage() {
  // In a real app, fetch consultations from Firestore
  const consultations = mockConsultations;

  const getStatusBadgeVariant = (status: Consultation['status']) => {
    switch (status) {
      case 'Completed': return 'default'; // default will use primary color
      case 'Transcribing':
      case 'Summarizing': return 'secondary';
      case 'Failed': return 'destructive';
      default: return 'outline';
    }
  };


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
            <div className="mx-auto bg-accent rounded-full p-4 w-fit mb-4">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">No Consultations Yet</CardTitle>
            <CardDescription className="text-lg">
              Start a new consultation to see your summaries here.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Link href="/dashboard/consultations/new" passHref>
              <Button size="lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Record First Consultation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]"> {/* Adjust height as needed */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{consultation.patientName}</CardTitle>
                     <Badge variant={getStatusBadgeVariant(consultation.status)}>{consultation.status}</Badge>
                  </div>
                  <CardDescription>
                    {format(new Date(consultation.date), "PPP p")} {/* Format: Oct 15, 2023 10:30 AM */}
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
                    <Button variant="outline" className="w-full" disabled={consultation.status !== 'Completed'}>
                      View Summary
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
