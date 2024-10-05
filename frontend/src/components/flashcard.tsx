"use client"

import { useState } from 'react'
import { Play, Eye, EyeOff, X, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import imagePlaceholder from '@/assets/image-placeholder.png'

interface Word {
  text: string
  meaning: string
}

interface Flashcard {
  image: string
  sentence: Word[]
  translation: string
  audio: string
}

const sampleFlashcard: Flashcard = {
  image: imagePlaceholder.src,
  sentence: [
    { text: "The", meaning: "Definite article" },
    { text: "quick", meaning: "Moving fast" },
    { text: "brown", meaning: "Color of coffee" },
    { text: "fox", meaning: "A wild canine" },
    { text: "jumps", meaning: "Leaps" },
    { text: "over", meaning: "Above" },
    { text: "the", meaning: "Definite article" },
    { text: "lazy", meaning: "Not eager to work" },
    { text: "dog", meaning: "A domesticated canine" },
  ],
  translation: "El rápido zorro marrón salta sobre el perro perezoso",
  audio: "/sample-audio.mp3",
}

export default function Flashcard() {
  const [flashcard, setFlashcard] = useState<Flashcard>(sampleFlashcard)
  const [showTranslation, setShowTranslation] = useState(true)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)

  const playAudio = () => {
    const audio = new Audio(flashcard.audio)
    audio.play()
  }

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation)
  }

  const nextCard = (correct: boolean) => {
    // In a real app, you'd fetch the next flashcard here
    console.log(correct ? "Marked as correct" : "Marked as incorrect")
  }

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
                  <span className="sr-only">{showTranslation ? "Hide translation" : "Show translation"}</span>
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
  )
}