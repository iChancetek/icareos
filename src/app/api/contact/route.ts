import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, organization, subject, message } = body;

        // Basic Validation
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (message.length < 10) {
            return NextResponse.json(
                { error: "Message must be at least 10 characters long" },
                { status: 400 }
            );
        }

        // Send email using Resend
        const data = await resend.emails.send({
            from: "iCareOS Platform <onboarding@resend.dev>", // Resend test domain or verified domain
            to: "chancellor@ichancetek.com",
            replyTo: email,
            subject: `New Contact Request: ${subject}`,
            html: `
        <h2>New Contact Message from iCareOS Website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Organization:</strong> ${organization || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <br />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      `,
        });

        if (data.error) {
            console.error("Resend API Error:", data.error);
            return NextResponse.json(
                { error: "Failed to send email via Resend" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("Contact API Route Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
