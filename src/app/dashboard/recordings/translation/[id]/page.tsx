

"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Download, Trash2, Loader2, PlayCircle, Languages, MessageCircle, Play, StopCircle, Volume2, FileText } from 'lucide-react';
import type { Translation, TranslationLanguage } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function TranslationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { getTranslationById, deleteTranslation } = useAuth();

  const [translation, setTranslation] = useState<Translation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLanguage, setTtsLanguage] = useState<TranslationLanguage>('English');

  const fetchTranslation = useCallback(async () => {
    if (id) {
        setIsLoading(true);
        const foundTranslation = await getTranslationById(id);
        
        if (!foundTranslation) {
            toast({
                title: "Translation Not Found",
                description: "Could not find the requested recording.",
                variant: "destructive"
            });
            router.push('/dashboard/recordings');
            return;
        }
        
        setTranslation(foundTranslation);
        setTtsLanguage(foundTranslation.targetLanguage);
        setIsLoading(false);
    }
  }, [id, getTranslationById, router, toast]);

  useEffect(() => {
    fetchTranslation();

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [id, fetchTranslation]);

  const handleDelete = async () => {
    if (!translation) return;
    
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }

    const success = await deleteTranslation(id);
    if(success) {
        toast({ title: "Recording Deleted", description: `The translation recording has been removed.` });
        router.push('/dashboard/recordings');
    } else {
        toast({ title: "Delete Failed", description: "Could not delete the recording. Please try again.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!translation) return;

    const { sourceLanguage, targetLanguage, sourceTranscript, translatedText, summary, date } = translation;
    const formattedDate = format(new Date(date), "yyyy-MM-dd_HH-mm");
    const filename = `translation_${formattedDate}.txt`;

    let content = `Translation Session\nDate: ${format(new Date(date), "PPP p")}\n\n`;
    content += `Source Language: ${sourceLanguage}\n`;
    content += `Target Language: ${targetLanguage}\n\n`;
    content += `--- Original Transcript ---\n${sourceTranscript}\n\n`;
    content += `--- Translated Text ---\n${translatedText}\n\n`;
    content += `--- AI Summary of Original ---\n${summary}\n`;

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

  const handleTogglePlayStop = (text: string | undefined, lang: TranslationLanguage) => {
    if (!text) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        toast({ title: "TTS Error", description: `Could not play audio in ${lang}.`, variant: "destructive" });
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setTtsLanguage(lang);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!translation) {
    return <div className="text-center py-10">Recording not found.</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button variant="outline" onClick={() => router.push('/dashboard/recordings')} className="mb-6 shadow hover:shadow-md">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Recordings
      </Button>

      <Card className="shadow-xl mb-8 bg-card/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
                 <Languages className="h-8 w-8 text-primary" />
                 Translation Session
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="shadow-sm" onClick={handleDownload}>
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
                      This action cannot be undone. This will permanently delete this recording.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <CardDescription>
            Recorded on: {format(new Date(translation.date), "PPP p")}
          </CardDescription>
        </CardHeader>
        
        <Separator />

        <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
            {/* Source Transcript */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Original ({translation.sourceLanguage})</h2>
                    <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePlayStop(translation.sourceTranscript, translation.sourceLanguage)}
                        disabled={isSpeaking && ttsLanguage !== translation.sourceLanguage}
                    >
                       {isSpeaking && ttsLanguage === translation.sourceLanguage ? <StopCircle className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                       {isSpeaking && ttsLanguage === translation.sourceLanguage ? 'Stop' : 'Listen'}
                    </Button>
                </div>
                <ScrollArea className="h-60 rounded-md border p-4 bg-muted/30 shadow-inner">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{translation.sourceTranscript}</p>
                </ScrollArea>
            </div>

            {/* Translated Text */}
            <div className="space-y-2">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Translation ({translation.targetLanguage})</h2>
                     <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePlayStop(translation.translatedText, translation.targetLanguage)}
                        disabled={isSpeaking && ttsLanguage !== translation.targetLanguage}
                    >
                       {isSpeaking && ttsLanguage === translation.targetLanguage ? <StopCircle className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                       {isSpeaking && ttsLanguage === translation.targetLanguage ? 'Stop' : 'Listen'}
                    </Button>
                </div>
                <ScrollArea className="h-60 rounded-md border p-4 bg-primary/10 shadow-inner">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{translation.translatedText}</p>
                </ScrollArea>
            </div>
            
            {/* Summary */}
             <div className="space-y-2 md:col-span-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> AI Summary</h2>
                <ScrollArea className="h-40 rounded-md border p-4 bg-accent/20 shadow-inner">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{translation.summary}</p>
                </ScrollArea>
            </div>

             {/* Audio Player Section */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t">
                <h2 className="text-2xl font-semibold flex items-center">
                    <PlayCircle className="mr-3 h-7 w-7 text-primary" />
                    Original Audio Recording
                </h2>
                <audio controls src={translation.audioDataUri} className="w-full rounded-md shadow-inner bg-accent/10 p-2">
                    Your browser does not support the audio element.
                </audio>
            </div>
        </CardContent>
         <CardFooter className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground w-full">
                This information is AI-generated and should be reviewed for accuracy.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
