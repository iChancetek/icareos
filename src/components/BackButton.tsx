"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
    className?: string;
}

export function BackButton({ className = "" }: BackButtonProps) {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className={`flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group ${className}`}
            aria-label="Go back"
        >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
        </button>
    );
}
