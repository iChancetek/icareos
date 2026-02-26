import AiIntakeChat from "@/components/chat/AiIntakeChat";
import CdsImageUpload from "@/components/chat/CdsImageUpload";

export default function IntakePage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
                        AI-Native Patient Intake
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
                        Goal-driven conversational interaction powered by LangGraph.
                    </p>
                </div>

                <AiIntakeChat />
            </div>

            {/* Phase 7: Multimodal CDS Upload */}
            <div className="max-w-3xl mx-auto pt-8 border-t border-gray-200">
                <CdsImageUpload />
            </div>
        </div>
    );
}
