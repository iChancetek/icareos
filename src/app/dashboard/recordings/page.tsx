"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old /recordings route to iscribe dashboard
export default function RecordingsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace("/dashboard/iscribe"); }, [router]);
    return null;
}
