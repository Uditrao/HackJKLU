export type Flashcard = {
    id: number;
    learningText: string;   // Hindi word/phrase (Devanagari)
    supportText: string;    // English meaning
    context?: string;       // Optional usage note
};

export const flashcards: Flashcard[] = [
    {
        id: 1,
        learningText: "नमस्ते",
        supportText: "Namaste · Hello / Greetings",
        context: "A universal greeting used across India."
    },
    {
        id: 2,
        learningText: "धन्यवाद",
        supportText: "Dhanyavaad · Thank you",
        context: "Formal way to express gratitude."
    },
    {
        id: 3,
        learningText: "सुप्रभात",
        supportText: "Suprabhaat · Good morning",
        context: "Literally 'good dawn'."
    },
    {
        id: 4,
        learningText: "पानी",
        supportText: "Paanee · Water",
        context: "An essential word for any traveler."
    },
    {
        id: 5,
        learningText: "खाना",
        supportText: "Khaana · Food / To eat",
        context: "Can mean both the noun 'food' and the verb 'to eat'."
    },
    {
        id: 6,
        learningText: "दोस्त",
        supportText: "Dost · Friend",
        context: "Commonly used in casual conversation."
    },
    {
        id: 7,
        learningText: "चाय",
        supportText: "Chaay · Tea",
        context: "India's favorite beverage, often served with milk and sugar."
    }
];
