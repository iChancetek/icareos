"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "MediScribe has given me back 2 hours of my day. The SOAP notes are incredibly accurate and instantly ready for the EHR.",
        author: "Dr. Sarah Jenkins",
        role: "Internal Medicine",
    },
    {
        quote: "The ability of the AI to pick up on nuanced symptoms while I just have a natural conversation with the patient is magical.",
        author: "Dr. Michael Chen",
        role: "Family Practice",
    },
    {
        quote: "I was skeptical about AI in the clinic, but the HIPAA compliance and flawless transcription won me over entirely.",
        author: "Dr. Emily Rostova",
        role: "Cardiology",
    },
    {
        quote: "It feels like having an elite medical scribe in my pocket. The Spanish translation feature is a lifesaver.",
        author: "Dr. Carlos Ramirez",
        role: "Emergency Medicine",
    },
    {
        quote: "I no longer experience 'pajama time' charting at home. My burnout levels have significantly decreased.",
        author: "Dr. Aisha Patel",
        role: "Pediatrics",
    }
];

export function Testimonials() {
    return (
        <section className="py-24 bg-background overflow-hidden relative">
            <div className="container px-6 mx-auto mb-16 text-center">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Trusted by Specialists</h2>
                <p className="text-lg text-muted-foreground">Join thousands of providers redefining their workflow.</p>
            </div>

            <div className="relative w-full flex overflow-x-hidden">
                {/* Transparent gradient masks for smooth fade out at edges */}
                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                <motion.div
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="flex gap-8 whitespace-nowrap px-4"
                >
                    {/* Render the array twice to create a seamless infinite scroll illusion */}
                    {[...testimonials, ...testimonials].map((item, i) => (
                        <div
                            key={i}
                            className="w-[400px] shrink-0 p-8 rounded-2xl bg-card border border-border/50 shadow-md whitespace-normal flex flex-col justify-between"
                        >
                            <div className="mb-6">
                                <div className="flex text-yellow-500 mb-4">
                                    {[...Array(5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-current" />)}
                                </div>
                                <p className="text-lg text-foreground italic leading-relaxed">"{item.quote}"</p>
                            </div>
                            <div>
                                <p className="font-bold text-primary">{item.author}</p>
                                <p className="text-sm text-muted-foreground">{item.role}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
