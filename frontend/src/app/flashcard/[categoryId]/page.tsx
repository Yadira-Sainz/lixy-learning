"use client";

import { useParams } from 'next/navigation'; // Usa useParams para obtener el ID de la categoría
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
  const { categoryId } = useParams(); // Obtiene el parámetro categoryId de la URL
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Índice de la tarjeta actual
  const [isClient, setIsClient] = useState(false);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);

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

  // Generar una frase cuando la tarjeta cambie
  useEffect(() => {
    if (flashcards.length > 0) {
      const currentWord = flashcards[currentCardIndex].sentence[0].word;
      generateSentence(currentWord); // Generar frase automáticamente
    }
  }, [currentCardIndex, flashcards]);

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

  const previousCard = () => {
    // Retroceder a la tarjeta anterior
    const newIndex = currentCardIndex > 0 ? currentCardIndex - 1 : flashcards.length - 1;
    setCurrentCardIndex(newIndex);
  };

  const generateSentence = async (word: string) => {
    try {
      const token = localStorage.getItem('token'); // Obtén el token del almacenamiento local
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-sentence`, 
        { word }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGeneratedSentence(response.data.sentence);
    } catch (error) {
      console.error('Error generating sentence:', error);
    }
  };

  // Aseguramos que no se renderice en el servidor
  if (!isClient) {
    return null;
  }

  // Función para resaltar la palabra en negritas dentro de la frase generada
  const highlightWordInSentence = (sentence: string, word: string, definition: string) => {
    const regex = new RegExp(`(${word})`, 'gi'); // Crear una expresión regular para buscar la palabra
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
                {/* Mostrar solo la frase generada automáticamente */}
                {generatedSentence && (
                  <p className="text-2xl mt-2">
                    {highlightWordInSentence(generatedSentence, flashcards[currentCardIndex].sentence[0].word, flashcards[currentCardIndex].sentence[0].definition)}
                  </p>
                )}

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
