"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check } from 'lucide-react';

type Word = {
  text: string;
  meaning: string;
};

type FlashcardType = {
  image: string;
  sentence: Word[];
  translation: string;
};

const FlashcardComponent: React.FC = () => {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const [flashcard, setFlashcard] = useState<FlashcardType | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetch(`/api/vocabulary/${categoryId}`)
        .then((response) => response.json())
        .then((data: FlashcardType) => setFlashcard(data))
        .catch((error) => console.error('Error fetching data:', error));
    }
  }, [categoryId]);

  if (!categoryId || !flashcard) {
    return <div>Loading...</div>;
  }

  const playAudio = () => {
    // Lógica para reproducir audio
  };
  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };
  const setSelectedWord = (word: Word) => {
    // Lógica para seleccionar una palabra
  };
  const nextCard = (isCorrect: boolean) => {
    // Lógica para pasar a la siguiente tarjeta
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
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
                        {word.text}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{word.meaning}</p>
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
