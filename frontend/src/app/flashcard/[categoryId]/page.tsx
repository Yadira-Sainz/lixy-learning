"use client";

import { useParams } from 'next/navigation'; // Usa useParams para obtener el ID de la categoría
import { useEffect, useState } from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Eye, EyeOff, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const { categoryId } = useParams(); // Obtiene el parámetro categoryId de la URL
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Índice de la tarjeta actual
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Marca que estamos en el cliente
    const token = localStorage.getItem('token'); // O donde sea que almacenes el token

    if (categoryId && token) {
      // Realizamos la petición de datos cuando ya tenemos el categoryId y el token
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vocabulary/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, // Enviar el token en la cabecera
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
    // Lógica para reproducir audio
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const nextCard = (isCorrect: boolean) => {
    // Lógica para manejar si el usuario responde correctamente o no
    const newIndex = currentCardIndex < flashcards.length - 1 ? currentCardIndex + 1 : 0;
    setCurrentCardIndex(newIndex);
  };

  const setSelectedWord = (word: Word) => {
    console.log("Palabra seleccionada:", word);
    // Aquí puedes agregar la lógica que quieras para cuando se seleccione una palabra.
  };  

  const previousCard = () => {
    // Retroceder a la tarjeta anterior
    const newIndex = currentCardIndex > 0 ? currentCardIndex - 1 : flashcards.length - 1;
    setCurrentCardIndex(newIndex);
  };

  // Aseguramos que no se renderice en el servidor
  if (!isClient) {
    return null;
  }

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
                <h2 className="text-2xl font-bold break-words">
                  {flashcards[currentCardIndex].sentence.map((word, index) => (
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
                  <p className="text-gray-600 break-words">{flashcards[currentCardIndex].translation}</p>
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
