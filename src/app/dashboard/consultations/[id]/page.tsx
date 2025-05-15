
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, FileText, MessageSquare, Download, Edit3, Trash2, Loader2 } from 'lucide-react';
import type { Consultation } from '@/types';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Mock data - replace with API call in a real app
const mockConsultations: Consultation[] = [
  {
    id: '1',
    patientName: 'John Doe',
    date: new Date(2023, 10, 15, 10, 30).toISOString(),
    status: 'Completed',
    transcript: `Doctor: Good morning, John. What brings you in today?\nJohn: Morning, Doctor. I've been having this persistent cough for about a week now, and I'm starting to feel quite fatigued.\nDoctor: I see. Any fever or body aches?\nJohn: Yes, a low-grade fever in the evenings, and my muscles feel a bit sore.\nDoctor: Alright, let's have a listen to your lungs... (Sound of stethoscope)... Lungs sound clear. It's likely a viral infection, common this time of year. I'd recommend plenty of rest, stay hydrated, and you can take some over-the-counter medication for the fever and aches. If it doesn't improve in 3-4 days, or if you feel worse, please come back.\nJohn: Okay, Doctor. Thank you.`,
    summary: 'Patient John Doe presented with a week-long persistent cough, fatigue, low-grade evening fevers, and muscle soreness. Lung examination was clear. Diagnosis points to a viral infection. Recommended treatment includes rest, hydration, and OTC medication for symptoms. Advised to return if no improvement in 3-4 days or if condition worsens.',
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    date: new Date(2023, 10, 16, 14, 0).toISOString(),
    status: 'Completed',
    transcript: `Doctor: Hello Jane, good to see you. Here for your annual check-up?\nJane: Yes, Doctor. Everything's been fine, just the usual.\nDoctor: Excellent. Let's go over your vitals... Blood pressure is 120/80, heart rate is 70. All good. Any changes in your diet or exercise routine?\nJane: I've been trying to eat more vegetables and walk for 30 minutes a day.\nDoctor: That's great to hear, Jane. Keep it up. Your lab results from last week also look perfect. Continue with your healthy habits, and I'll see you next year unless anything comes up.\nJane: Wonderful. Thanks, Doctor!`,
    summary: 'Patient Jane Smith attended for an annual check-up. Vitals (BP 120/80, HR 70) are normal. Patient reports positive lifestyle changes including increased vegetable intake and daily walks. Recent lab results are perfect. Advised to continue healthy habits and schedule next check-up in a year.',
  },
];


export default function ConsultationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');


  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setTimeout(() => {
        // Try to get data from localStorage first (for newly created items)
        const storedPatientName = localStorage.getItem(`consultation-${id}-patientName`);
        const storedTranscript = localStorage.getItem(`consultation-${id}-transcript`);
        const storedSummary = localStorage.getItem(`consultation-${id}-summary`);
        const storedDate = localStorage.getItem(`consultation-${id}-date`);

        let foundConsultation: Consultation | undefined;

        if (storedPatientName && storedTranscript && storedSummary && storedDate) {
          foundConsultation = {
            id: id,
            patientName: storedPatientName,
            date: storedDate,
            status: 'Completed',
            transcript: storedTranscript,
            summary: storedSummary,
          };
        } else {
          // Fallback to mock data if not in localStorage
           foundConsultation = mockConsultations.find(c => c.id === id);
        }
        
        // Fallback for completely new/unknown ID not in localStorage or mocks
        if (!foundConsultation) {
            foundConsultation = {
                id: id,
                patientName: `Patient ${id.substring(0,4)}`,
                date: new Date().toISOString(),
                status: 'Completed',
                transcript: `This is a sample transcript for consultation ID ${id}. The patient discussed various symptoms with the doctor. The doctor provided advice and a potential treatment plan. This is a longer text to simulate a real transcript which can be quite extensive and cover multiple topics during the medical consultation. It's important for the AI to accurately capture all key details.`,
                summary: `This is an AI-generated summary for consultation ID ${id}. Key points: symptom discussion, doctor's advice, treatment plan. This summary is concise and highlights the most critical information for quick review.`
            };
        }
        
        setConsultation(foundConsultation);
        setEditableSummary(foundConsultation.summary || '');
        setEditableTranscript(foundConsultation.transcript || '');
        
        setIsLoading(false);
      }, 500);
    }
  }, [id, router, toast]);

  const handleSaveSummary = () => {
    if (!consultation) return;
    console.log("Saving summary:", editableSummary);
    const updatedConsultation = { ...consultation, summary: editableSummary };
    setConsultation(updatedConsultation);
    setIsEditingSummary(false);
    localStorage.setItem(`consultation-${consultation.id}-summary`, editableSummary); // Update localStorage
    toast({ title: "Summary Updated", description: "Your changes have been saved." });
  };

  const handleSaveTranscript = () => {
     if (!consultation) return;
    console.log("Saving transcript:", editableTranscript);
    const updatedConsultation = { ...consultation, transcript: editableTranscript };
    setConsultation(updatedConsultation);
    setIsEditingTranscript(false);
    localStorage.setItem(`consultation-${consultation.id}-transcript`, editableTranscript); // Update localStorage
    toast({ title: "Transcript Updated", description: "Your changes have been saved." });
  };

  const handleDeleteConsultation = () => {
    if (!consultation) return;
    console.log("Deleting consultation:", id);
    localStorage.removeItem(`consultation-${id}-patientName`);
    localStorage.removeItem(`consultation-${id}-transcript`);
    localStorage.removeItem(`consultation-${id}-summary`);
    localStorage.removeItem(`consultation-${id}-date`);
    toast({ title: "Consultation Deleted", description: `Consultation for ${consultation?.patientName} has been removed.` });
    router.push('/dashboard/consultations');
  };

  const handleDownloadConsultation = () => {
    if (!consultation) return;

    const { patientName, date, summary, transcript } = consultation;
    const formattedDate = format(new Date(date), "yyyy-MM-dd_HH-mm");
    const filename = `consultation_${patientName.replace(/\s+/g, '_')}_${formattedDate}.txt`;

    const content = `Patient Name: ${patientName}\nConsultation Date: ${format(new Date(date), "PPP p")}\n\nAI Summary:\n--------------------------------------------------\n${summary || 'No summary available.'}\n\nFull Transcript:\n--------------------------------------------------\n${transcript || 'No transcript available.'}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Download Started", description: `Downloading ${filename}` });
  };


  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!consultation) {
    return <div className="text-center py-10">Consultation not found. Please go back and create one.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button variant="outline" onClick={() => router.push('/dashboard/consultations')} className="mb-6 shadow hover:shadow-md">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Consultations
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-3xl font-bold">{consultation.patientName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="shadow-sm" onClick={handleDownloadConsultation}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shadow-sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      consultation data for {consultation.patientName}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConsultation}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <CardDescription>
            Consultation Date: {format(new Date(consultation.date), "PPP p")}
          </CardDescription>
        </CardHeader>
        
        <Separator />

        <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
          {/* Summary Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold flex items-center">
                <FileText className="mr-3 h-7 w-7 text-primary" />
                AI Summary
              </h2>
              {!isEditingSummary ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingSummary(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={handleSaveSummary}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingSummary(false);
                    setEditableSummary(consultation.summary || '');
                  }}>Cancel</Button>
                </div>
              )}
            </div>
            {isEditingSummary ? (
              <div className="space-y-2">
                <Label htmlFor="summary-edit" className="sr-only">Edit Summary</Label>
                <Textarea
                  id="summary-edit"
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  rows={10}
                  className="text-base leading-relaxed bg-background/70 shadow-inner"
                />
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border p-4 bg-accent/30 shadow-inner">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {consultation.summary || 'No summary available.'}
                </p>
              </ScrollArea>
            )}
          </div>

          {/* Transcript Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold flex items-center">
                <MessageSquare className="mr-3 h-7 w-7 text-primary" />
                Full Transcript
              </h2>
               {!isEditingTranscript ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTranscript(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={handleSaveTranscript}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingTranscript(false);
                    setEditableTranscript(consultation.transcript || '');
                  }}>Cancel</Button>
                </div>
              )}
            </div>
             {isEditingTranscript ? (
              <div className="space-y-2">
                <Label htmlFor="transcript-edit" className="sr-only">Edit Transcript</Label>
                <Textarea
                  id="transcript-edit"
                  value={editableTranscript}
                  onChange={(e) => setEditableTranscript(e.target.value)}
                  rows={15}
                  className="text-sm leading-relaxed bg-background/70 shadow-inner"
                />
              </div>
            ) : (
              <ScrollArea className="h-[26.5rem] rounded-md border p-4 bg-background/50 shadow-inner"> {/* h-96 + h-8 for edit button height approx */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {consultation.transcript || 'No transcript available.'}
                </p>
              </ScrollArea>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground w-full">
                This information is AI-generated and should be reviewed by a medical professional.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
