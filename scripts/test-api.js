/**
 * test-api.js
 * Pings the local Next.js API route to verify the backend is responsive.
 */

async function ping() {
    try {
        console.log("Pinging http://localhost:9002/api/ai-native/chat...");
        const response = await fetch("http://localhost:9002/api/ai-native/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Hello, this is a test ping.",
                threadId: "test-thread",
                context: {}
            })
        });

        // The endpoint uses streaming, but we can just check the status
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log("✅ Frontend to Backend communication is WORKING.");
        } else {
            console.log("❌ Backend returned an error.");
        }
    } catch (e) {
        console.error("❌ Failed to reach backend:", e.message);
    }
}

ping();
