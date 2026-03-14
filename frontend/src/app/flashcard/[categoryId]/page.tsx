"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/locale-context';
import { getCardsPerSession, getIncludeTranslation } from '@/lib/config';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check } from 'lucide-react';
import axios from 'axios';
import FlashcardDash from '../page';
import { useRouter } from 'next/navigation';
import StreakCompletionModal from '@/components/ui/streak-completion-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

let completedCardsCount = 0; // Global variable to keep track of completed cards

const FlashcardComponent: React.FC = () => {
  const { t } = useLocale();
  const { categoryId } = useParams<{ categoryId: string }>(); // Gets the categoryId parameter from the URL
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(() => getIncludeTranslation());
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0); // Index of the current card
  const [isClient, setIsClient] = useState<boolean>(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);
  const [translatedSentence, setTranslatedSentence] = useState<string | null>(null); // State for translated sentence
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(''); // State for the current image URL
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streakData, setStreakData] = useState<{ currentStreak: number; longestStreak: number; newBadges: Array<{ badge_id: number; badge_key: string; name_es: string; description_es: string; required_streak: number; icon_name: string }> }>({ currentStreak: 0, longestStreak: 0, newBadges: [] });

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('token');
    const limit = getCardsPerSession();

    if (categoryId && token) {
      setIsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/daily-words/${categoryId}?limit=${limit}`, {
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
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
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
        setShowTranslation(getIncludeTranslation()); // Reset visibility según config al cambiar de tarjeta
        setGeneratedSentence(null);
        setTranslatedSentence(null);
        generateSentence(currentWord); // Automatically generate sentence
        // Fetch the image for the current word
        fetchImageUrl(currentWord).then((imageUrl) => setCurrentImageUrl(imageUrl)); // Fetch and set the image URL for the current word
      }
    }
  }, [currentCardIndex, flashcards]);

  const generateSentence = async (word: string): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-sentence`, 
        { word }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const generated = response.data.sentence;
      setGeneratedSentence(generated);
      await translateSentence(generated);
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

  const playAudio = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-audio`, 
        { sentence: generatedSentence }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      const audioUrl = response.data.audioUrl;
      const fullAudioUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}${audioUrl}`; // Full URL of the audio file
  
      console.log('Audio URL:', fullAudioUrl);  // Verify that it is correct
  
      const audio = new Audio(fullAudioUrl);
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };  

  const toggleTranslation = (): void => {
    setShowTranslation(!showTranslation);
  };

  const nextCard = (isCorrect: boolean): void => {
    const currentWordId = flashcards[currentCardIndex]?.sentence[0]?.vocabulary_id;
    const cardsPerSession = getCardsPerSession();
    if (currentWordId) {
      updateProgress(currentWordId, isCorrect);
      completedCardsCount++;
      if (completedCardsCount >= cardsPerSession) {
        updateDailyStreak();
        completedCardsCount = 0;
      }
    }
    const newIndex = (currentCardIndex + 1) % flashcards.length;
    setCurrentCardIndex(newIndex);
  };

  const previousCard = (): void => {
    const newIndex = currentCardIndex > 0 ? currentCardIndex - 1 : flashcards.length - 1;
    setCurrentCardIndex(newIndex);
  };

  //Update progress
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

  //Update daily streak
  const updateDailyStreak = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/daily-streak`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStreakData({
        currentStreak: res.data.currentStreak ?? 0,
        longestStreak: res.data.longestStreak ?? 0,
        newBadges: res.data.newBadges ?? [],
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error updating daily streak:', error);
    }
  };

const handleCloseModal = () => {
  setIsModalOpen(false); // Close the modal
  router.push('/tablero');
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

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-16 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{t('flashcard.loading')}</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">{t('flashcard.empty')}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {flashcards.length > 0 && (
          <Card key={flashcards[currentCardIndex].id} className="p-6">
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
              <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
                {currentImageUrl ? (
                  <>
                    <img src={currentImageUrl} alt="Flashcard image" className="w-full max-w-[200px] h-auto object-cover rounded-lg mb-1" />
                    <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline mb-4 block">Image from Pixabay</a>
                  </>
                ) : (
                  <div className="w-full max-w-[200px] h-[150px] bg-muted rounded-lg flex items-center justify-center mb-4 text-muted-foreground text-sm">{t('flashcard.loadingImage')}</div>
                )}
                <div className="flex space-x-2 justify-center md:justify-start">
                  <Button variant="outline" size="icon" onClick={playAudio}>
                    <Play className="h-4 w-4" />
                    <span className="sr-only">{t('flashcard.playAudio')}</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={toggleTranslation}>
                    {showTranslation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showTranslation ? t('flashcard.hideTranslation') : t('flashcard.showTranslation')}</span>
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
                  <p className="text-muted-foreground break-words">{translatedSentence}</p>
                )}
              </div>
            </div>
          </Card>
        )}
        <div className="flex justify-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => nextCard(false)}>
            <X className="h-6 w-6" />
            <span className="sr-only">{t('flashcard.incorrect')}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => nextCard(true)}>
            <Check className="h-6 w-6" />
            <span className="sr-only">{t('flashcard.correct')}</span>
          </Button>
        </div>
        <StreakCompletionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          completedCount={getCardsPerSession()}
          newBadges={streakData.newBadges}
        />
      </div>
    </TooltipProvider>
  );
};

export default FlashcardComponent;