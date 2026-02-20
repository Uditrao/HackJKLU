import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'text-text';
    const language = searchParams.get('language') || 'hi';

    const flashcards = [
        {
            id: "1",
            learningText: "नमस्ते",
            supportText: "Hello / Greetings",
            audioPrompt: null,
            context: "A universal greeting used across India."
        },
        {
            id: "2",
            learningText: "धन्यवाद",
            supportText: "Thank you",
            audioPrompt: null,
            context: "Formal way to express gratitude."
        },
        {
            id: "3",
            learningText: "सुप्रभात",
            supportText: "Good morning",
            audioPrompt: null,
            context: "Literally 'good dawn'."
        },
        {
            id: "4",
            learningText: "दोस्त",
            supportText: "Friend",
            audioPrompt: null,
            context: "Commonly used in casual conversation."
        },
        {
            id: "5",
            learningText: "क्या हाल है?",
            supportText: "How are you?",
            audioPrompt: null,
            context: "A common casual check-in."
        }
    ];

    // Simulate different data for "speech" modes if needed
    // In a real app, 'audioPrompt' might be a pre-generated URL
    // Here we'll rely on the frontend TTS to generate it based on learningText

    return NextResponse.json(flashcards);
}
