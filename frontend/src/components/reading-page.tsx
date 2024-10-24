"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayIcon, EyeOffIcon, ChevronRightIcon } from 'lucide-react'

type Word = { id: number; word: string; definition: string; };

export default function Component() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [storyId, setStoryId] = useState<string | null>(null)
  const [vocabulary, setVocabulary] = useState<Word[]>([])
  const [generatedStory, setGeneratedStory] = useState<{ title: string; content: string; story_id?: string } | null>(null)
  const [highlightsVisible, setHighlightsVisible] = useState(true)
  const [selectedWord, setSelectedWord] = useState<Word | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken)

    const catId = searchParams.get('categoryId')
    const sId = searchParams.get('storyId')
    
    console.log('Received params:', { categoryId: catId, storyId: sId })
    
    setCategoryId(catId)
    setStoryId(sId)

    if (catId && storedToken) {
      fetchVocabulary(catId, storedToken)
    } else {
      setError('Missing categoryId or token')
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (vocabulary.length > 0 && token && categoryId && storyId) {
      fetchStory(storyId, token, categoryId)
    } else if (!isLoading && vocabulary.length === 0) {
      setError('No vocabulary found for this category')
    }
  }, [vocabulary, token, categoryId, storyId, isLoading])

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
        console.error('Failed to fetch vocabulary')
        setError('Failed to fetch vocabulary')
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      setError('Error fetching vocabulary')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStory = async (storyId: string, token: string, categoryId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/story/${storyId}?categoryId=${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setGeneratedStory(data)
        if (storyId.startsWith('placeholder-')) {
          router.push(`/leer?categoryId=${categoryId}&storyId=${data.story_id}`)
        }
      } else {
        console.error('Failed to fetch story')
        setError('Failed to fetch story')
      }
    } catch (error) {
      console.error('Error fetching story:', error)
      setError('Error fetching story')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWordClick = (word: Word) => {
    setSelectedWord(word)
  }

  const handleQuizSubmit = () => {
    setQuizSubmitted(true)
    // Here you would typically send the quiz answers to the backend for processing
    console.log('Quiz submitted with answers:', quizAnswers)
  }

  const renderContent = () => {
    if (!generatedStory) return <p>Loading...</p>
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
    return <div className="text-red-500">Error: {error}</div>
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{generatedStory?.title || 'Loading'}</h1>
      <div className="flex flex-col lg:flex-row gap-4">
        <Card className="w-full lg:w-2/3 p-4 mb-4">
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
                      onClick={() => audioRef.current?.play()}
                      aria-label="Play Audio"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reproducir Audio</p>
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
                  <p>Siguiente Página</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>
        <audio ref={audioRef} src="/placeholder.mp3" />
        <Card className="w-full lg:w-1/3 p-4">
          <Tabs defaultValue="words" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="words">Palabras</TabsTrigger>
              <TabsTrigger value="quiz">Cuestionario</TabsTrigger>
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
                  <h2 className="text-xl font-bold mb-4">Quiz</h2>
                  {vocabulary.slice(0, 5).map((word, index) => (
                    <div key={word.id} className="mb-4">
                      <p className="font-semibold mb-2">{index + 1}. What does "{word.word}" mean?</p>
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        placeholder="Enter your answer"
                        value={quizAnswers[word.id] || ''}
                        onChange={(e) => setQuizAnswers({...quizAnswers, [word.id]: e.target.value})}
                        disabled={quizSubmitted}
                      />
                    </div>
                  ))}
                  <Button onClick={handleQuizSubmit} className="w-full mt-4" disabled={quizSubmitted}>
                    {quizSubmitted ? 'Quiz Submitted' : 'Submit Quiz'}
                  </Button>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}