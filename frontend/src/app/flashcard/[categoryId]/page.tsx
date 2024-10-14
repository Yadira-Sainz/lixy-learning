"use client";

import { useParams } from 'next/navigation'; // Uses useParams to get the category ID from the URL
import { useEffect, useState } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check } from 'lucide-react';
import axios from 'axios';

type Word = {
  id: number;
  word: string;
  definition: string;
};

type FlashcardType = {
  id: number;
  image: string;
  sentence: Word[];
  translation: string;
};

const FlashcardComponent = () => {
  const { categoryId } = useParams(); // Gets the categoryId parameter from the URL
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Index of the current card
  const [isClient, setIsClient] = useState(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);
  const [translatedSentence, setTranslatedSentence] = useState<string | null>(null); // State for translated sentence

  useEffect(() => {
    setIsClient(true); // Mark that we are on the client
    const token = localStorage.getItem('token'); // Or wherever you store the token

    if (categoryId && token) {
      // Fetch data when we have the categoryId and token
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vocabulary/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, // Send the token in the header
          'Content-Type': 'application/json',
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error fetching data');
          }
          return response.json();
        })
        .then((data: Word[]) => {
          const formattedData: FlashcardType[] = data.map((item) => ({
            id: item.id,
            image: '', // Provide logic to get or generate image URLs
            sentence: [{ id: item.id, word: item.word, definition: item.definition }],
            translation: '', // Set the appropriate translation if available
          }));
          setFlashcards(formattedData);
        })
        .catch((error) => console.error('Error fetching data:', error));
    }
  }, [categoryId]);

  // Generate a sentence when the card changes
  useEffect(() => {
    if (flashcards.length > 0) {
      const currentWord = flashcards[currentCardIndex].sentence[0].word;
      generateSentence(currentWord); // Automatically generate sentence
    }
  }, [currentCardIndex, flashcards]);

  // Generate a sentence and its translation
  const generateSentence = async (word: string) => {
    try {
      const token = localStorage.getItem('token'); // Get the token from local storage
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-sentence`, 
        { word }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const generated = response.data.sentence;
      setGeneratedSentence(generated);
      await translateSentence(generated); // Translate the generated sentence
    } catch (error) {
      console.error('Error generating sentence:', error);
    }
  };

  // Translate the generated sentence
  const translateSentence = async (sentence: string) => {
    try {
      const token = localStorage.getItem('token'); // Get the token from local storage
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/translate-sentence`, 
        { sentence }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTranslatedSentence(response.data.translatedSentence); // Set the translated sentence
    } catch (error) {
      console.error('Error translating sentence:', error);
    }
  };

  const playAudio = () => {
    // Logic to play audio
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const nextCard = (isCorrect: boolean) => {
    // Logic to handle if the user answers correctly or not
    const newIndex = currentCardIndex < flashcards.length - 1 ? currentCardIndex + 1 : 0;
    setCurrentCardIndex(newIndex);
  };

  const previousCard = () => {
    // Go back to the previous card
    const newIndex = currentCardIndex > 0 ? currentCardIndex - 1 : flashcards.length - 1;
    setCurrentCardIndex(newIndex);
  };

  // Ensure it does not render on the server
  if (!isClient) {
    return null;
  }

  // Function to highlight the word in bold within the generated sentence
  const highlightWordInSentence = (sentence: string, word: string, definition: string) => {
    const regex = new RegExp(`(${word})`, 'gi'); // Create a regex to search for the word
    return sentence.split(regex).map((part, index) => 
      regex.test(part) ? (
        <Tooltip key={index}>
          <TooltipTrigger>
            <strong className="text-blue-600 cursor-pointer">{part}</strong>
          </TooltipTrigger>
          <TooltipContent>
            <p>{definition}</p>
          </TooltipContent>
        </Tooltip>
      ) : part
    );
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {flashcards.length > 0 && (
          <Card key={flashcards[currentCardIndex].id} className="p-6">
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
                <img src={flashcards[currentCardIndex].image} alt="Flashcard image" className="w-full max-w-[200px] h-auto object-cover rounded-lg mb-4" />
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
                {/* Show only the generated sentence */}
                {generatedSentence && (
                  <p className="text-2xl mt-2">
                    {highlightWordInSentence(generatedSentence, flashcards[currentCardIndex].sentence[0].word, flashcards[currentCardIndex].sentence[0].definition)}
                  </p>
                )}

                {showTranslation && translatedSentence && ( // Show the translated sentence when toggled
                  <p className="text-gray-600 break-words">{translatedSentence}</p>
                )}
              </div>
            </div>
          </Card>
        )}
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

export default FlashcardComponent;
