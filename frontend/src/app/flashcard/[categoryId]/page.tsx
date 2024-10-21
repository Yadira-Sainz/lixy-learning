"use client";

import { useParams } from 'next/navigation'; // Uses useParams to get the category ID from the URL
import { useEffect, useState } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check } from 'lucide-react';
import axios from 'axios';
import FlashcardDash from '../page';

type Word = {
  vocabulary_id: number;
  word: string;
  definition: string;
  image_url: string;
};

type FlashcardType = {
  id: number;
  sentence: Word[];
  translation: string;
};

const FlashcardComponent: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>(); // Gets the categoryId parameter from the URL
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0); // Index of the current card
  const [isClient, setIsClient] = useState<boolean>(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);
  const [translatedSentence, setTranslatedSentence] = useState<string | null>(null); // State for translated sentence
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(''); // State for the current image URL

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
  
    if (categoryId && token) {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/daily-words/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
          const formattedData: FlashcardType[] = data.map((item: Word) => ({
            id: item.vocabulary_id,
            sentence: [{ vocabulary_id: item.vocabulary_id, word: item.word, definition: item.definition, image_url: item.image_url }],
            translation: '',
          }));
          setFlashcards(formattedData);
        })
        .catch((error) => console.error('Error fetching data:', error));
    }
  }, [categoryId]);  

  const fetchImageUrl = async (word: string): Promise<string> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-image-url`, 
        { word }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return response.data.imageUrl; // Return the image URL
    } catch (error) {
      console.error('Error fetching image URL:', error);
      return ''; // Return an empty string or handle the error accordingly
    }
  };

  // Generate a sentence when the card changes
  useEffect(() => {
    if (flashcards.length > 0) {
      console.log(flashcards);    
      const currentWord = flashcards[currentCardIndex]?.sentence[0]?.word;
      console.log(currentWord);
      if (currentWord) {
        generateSentence(currentWord); // Automatically generate sentence
        // Fetch the image for the current word
        fetchImageUrl(currentWord).then((imageUrl) => setCurrentImageUrl(imageUrl)); // Fetch and set the image URL for the current word
      }
    }
  }, [currentCardIndex, flashcards]);

  const generateSentence = async (word: string): Promise<void> => {
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

  const translateSentence = async (sentence: string): Promise<void> => {
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

  const playAudio = (): void => {
    // Logic to play audio
  };

  const toggleTranslation = (): void => {
    setShowTranslation(!showTranslation);
  };

  const nextCard = (isCorrect: boolean): void => {
    const currentWordId = flashcards[currentCardIndex]?.sentence[0]?.vocabulary_id;
    console.log(`WORD ID--> ${currentWordId}`)
    console.log(`CARD --> ${currentCardIndex}`)
    //console.log(flashcards)
    if (currentWordId) {
      updateProgress(currentWordId, isCorrect); // Update user progress
    }
    const newIndex = (currentCardIndex + 1) % flashcards.length;
    setCurrentCardIndex(newIndex);
  };

  const previousCard = (): void => {
    const newIndex = currentCardIndex > 0 ? currentCardIndex - 1 : flashcards.length - 1;
    setCurrentCardIndex(newIndex);
  };

  const updateProgress = async (wordId: number, correct: boolean): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/update-progress`,
        { wordId, correct },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Progress updated successfully');
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };
  
  const highlightWordInSentence = (sentence: string, word: string, definition: string) => {
    const regex = new RegExp(`(${word})`, 'gi');
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
                <img src={currentImageUrl} alt="Flashcard image" className="w-full max-w-[200px] h-auto object-cover rounded-lg mb-4" />
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
                {generatedSentence && (
                  <p className="text-2xl mt-2">
                    {highlightWordInSentence(generatedSentence, flashcards[currentCardIndex]?.sentence[0]?.word || '', flashcards[currentCardIndex]?.sentence[0]?.definition || '')}
                  </p>
                )}
                {showTranslation && translatedSentence && (
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
