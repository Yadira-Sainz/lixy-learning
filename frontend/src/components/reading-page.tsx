"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayIcon, EyeOffIcon, ChevronRightIcon } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type Word = { id: number; word: string; definition: string; };

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export default function ReadingPage() {
  const [token, setToken] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [readingIndex, setReadingIndex] = useState<number>(0)
  const [vocabulary, setVocabulary] = useState<Word[]>([])
  const [generatedStory, setGeneratedStory] = useState<{ title: string; content: string } | null>(null)
  const [highlightsVisible, setHighlightsVisible] = useState(true)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken)

    const catId = searchParams.get('categoryId')
    const readingIdx = searchParams.get('readingIndex')
    
    console.log('Received params:', { categoryId: catId, readingIndex: readingIdx })
    
    setCategoryId(catId)
    setReadingIndex(readingIdx ? parseInt(readingIdx) : 0)

    if (catId && storedToken) {
      fetchVocabulary(catId, storedToken)
    } else {
      setError('Missing categoryId or token')
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (vocabulary.length > 0 && token && categoryId) {
      generateStory()
    } else if (!isLoading && vocabulary.length === 0) {
      setError('No vocabulary found for this category')
    }
  }, [vocabulary, token, categoryId, isLoading])

  const fetchVocabulary = async (categoryId: string, token: string) => {
    try {
      console.log(`Fetching vocabulary for category ${categoryId}`)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vocabulary/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched vocabulary:', data)
        if (Array.isArray(data) && data.length > 0) {
          setVocabulary(data)
        } else {
          setError('No vocabulary found for this category')
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch vocabulary:', errorData)
        setError(`Failed to fetch vocabulary: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      setError(`Error fetching vocabulary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const generateStory = async () => {
    if (!token || !categoryId) {
      console.error('Missing token or categoryId')
      setError('Missing token or categoryId')
      setIsLoading(false)
      return;
    }
    const selectedWords = vocabulary.sort(() => 0.5 - Math.random()).slice(0, 5)
    const words = selectedWords.map(w => w.word).join(',')
    try {
      console.log('Generating story with words:', words)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-content?words=${words}&categoryId=${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Generated content:', data)
        if (data.story && data.quizQuestions) {
          setGeneratedStory(data.story)
          setQuizQuestions(data.quizQuestions)
        } else {
          setError('Invalid response format')
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to generate content:', errorData)
        setError(`Failed to generate content: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating content:', error)
      setError(`Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWordClick = (word: Word) => {
    setSelectedWord(word)
  }

  const handleQuizAnswerChange = (questionIndex: number, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answer }))
  }

  const handleQuizSubmit = () => {
    setQuizSubmitted(true)
  }

  const generateAudio = async () => {
    if (!token || !generatedStory) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentence: generatedStory.content }),
      });

      if (response.ok) {
        const data = await response.json();
        const fullAudioUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}${data.audioUrl}`;
        setAudioUrl(fullAudioUrl);
        if (audioRef.current) {
          audioRef.current.src = fullAudioUrl;
          audioRef.current.load(); // Load the new audio source
          audioRef.current.play().catch(e => console.error('Error playing audio:', e));
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to generate audio:', errorData)
        setError(`Failed to generate audio: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error generating audio:', error)
      setError(`Error generating audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderContent = () => {
    if (!generatedStory) return <p>Cargando...</p>
    return generatedStory.content.split(' ').map((word, index) => {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase()
      const highlightInfo = vocabulary.find(v => v.word.toLowerCase() === cleanWord)
      if (highlightInfo && highlightsVisible) {
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="cursor-pointer px-1 rounded bg-yellow-200"
                  onClick={() => handleWordClick(highlightInfo)}
                >
                  {word}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{highlightInfo.definition}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }
      return <span key={index}>{word} </span>
    })
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p>{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card className="p-4">
          <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
          <p>Por favor espera mientras cargamos el material de lectura.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{generatedStory?.title || 'Reading Page'}</h1>
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="w-full lg:w-2/3 p-4  mb-4">
          <ScrollArea className="h-[300px] lg:h-[400px] mb-4">
            <p className="mb-4 space-x-1">{renderContent()}</p>
          </ScrollArea>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setHighlightsVisible(!highlightsVisible)}
                      aria-label={highlightsVisible ? "Hide Highlights" : "Show Highlights"}
                    >
                      <EyeOffIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{highlightsVisible ? "Hide Highlights" : "Show Highlights"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={generateAudio}
                      aria-label="Play Audio"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play Audio</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="Next Page">
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next Page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>
        <Card className="w-full lg:w-1/3 p-4">
          <Tabs defaultValue="words" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="words"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Palabras
              </TabsTrigger>
              <TabsTrigger 
                value="quiz"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Cuestionario
              </TabsTrigger>
            </TabsList>
            <TabsContent value="words">
              <ScrollArea className="h-[300px] lg:h-[400px]">
                {selectedWord ? (
                  <div>
                    <h2 className="text-xl font-bold mb-2">{selectedWord.word}</h2>
                    <p className="mb-4">{selectedWord.definition}</p>
                  </div>
                ) : (
                  <p className="text-center mt-4">Haz click en una palabra resaltada para ver sus detalles.</p>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="quiz">
              <ScrollArea className="h-[300px] lg:h-[400px]">
                <div>
                  <h2 className="text-xl font-bold mb-4">Cuestionario</h2>
                  {quizQuestions.map((question, index) => (
                    <div key={index} className="mb-6">
                      <p className="font-semibold mb-2">{question.question}</p>
                      <RadioGroup
                        value={quizAnswers[index]}
                        onValueChange={(value) => handleQuizAnswerChange(index, value)}
                      >
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`q${index}-option${optionIndex}`} />
                            <Label htmlFor={`q${index}-option${optionIndex}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                      {quizSubmitted && (
                        <p className={`mt-2 ${quizAnswers[index] === question.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                          {quizAnswers[index] === question.correctAnswer ? '¡Correcto!' : `Incorrecto. La respuesta es: ${question.correctAnswer}`}
                        </p>
                      )}
                    </div>
                  ))}
                  <Button onClick={handleQuizSubmit} className="w-full" disabled={quizSubmitted}>
                    {quizSubmitted ? 'Enviado' : 'Enviar respuestas'}
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      <audio ref={audioRef} controls style={{ display: 'block', marginTop: '1rem' }} />
    </div>
  )
}