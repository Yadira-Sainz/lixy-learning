"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check } from 'lucide-react';

type Word = {
  id: number;            // Include id for word
  word: string;         // Corresponding to 'word' column
  definition: string;   // Corresponding to 'definition' column
};

type FlashcardType = {
  id: number;           // Add id to the FlashcardType
  image: string;        // Add an appropriate image URL if needed
  sentence: Word[];     // An array of Word objects
  translation: string;  // This should be defined appropriately
};

const FlashcardComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    console.log('Category ID:', categoryId); // Agrega esta línea para verificar el ID de categoría
  
    if (categoryId) {
      fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/vocabulary/${categoryId}`)
        .then((response) => response.json())
        .then((data: Word[]) => {
          const formattedData: FlashcardType[] = data.map((item) => ({
            id: item.id,
            image: '', // Proporciona lógica para obtener o generar URLs de imágenes
            sentence: [{ id: item.id, word: item.word, definition: item.definition }],
            translation: '', // Establece la traducción adecuada si está disponible
          }));
          setFlashcards(formattedData);
        })
        .catch((error) => console.error('Error fetching data:', error));
    }
  }, [categoryId]);  

  const playAudio = () => {
    // Logic to play audio
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const setSelectedWord = (word: Word) => {
    // Logic for selecting a word
  };

  const nextCard = (isCorrect: boolean) => {
    // Logic to move to the next card
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {flashcards.map((flashcard) => (
          <Card key={flashcard.id} className="p-6">
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
                <img src={flashcard.image} alt="Flashcard image" className="w-full max-w-[200px] h-auto object-cover rounded-lg mb-4" />
                <div className="flex space-x-2 justify-center md:justify-start">
                  <Button variant="outline" size="icon" onClick={playAudio}>
                    <Play className="h-4 w-4" />
                    <span className="sr-only">Play audio</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={toggleTranslation}>
                    {showTranslation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showTranslation ? 'Hide translation' : 'Show translation'}</span>
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-2/3 space-y-4">
                <h2 className="text-2xl font-bold break-words">
                  {flashcard.sentence.map((word, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <span
                          className="cursor-pointer hover:bg-gray-100 rounded px-1"
                          onClick={() => setSelectedWord(word)}
                        >
                          {word.word}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{word.definition}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </h2>
                {showTranslation && (
                  <p className="text-gray-600 break-words">{flashcard.translation}</p>
                )}
              </div>
            </div>
          </Card>
        ))}
        <div className="flex justify-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => nextCard(false)}>
            <X className="h-6 w-6" />
            <span className="sr-only">Incorrect</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => nextCard(true)}>
            <Check className="h-6 w-6" />
            <span className="sr-only">Correct</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

const FlashcardPage: React.FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <FlashcardComponent />
  </Suspense>
);

export default FlashcardPage;
