"use client"

import React, { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { PlayIcon, EyeOffIcon, ChevronRightIcon } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const readingData = {
  title: "The Importance of Reading",
  content: "Reading is a fundamental skill that enhances our knowledge and imagination. It allows us to explore new worlds and ideas without leaving our homes. Through reading, we can improve our vocabulary, critical thinking, and empathy. Regular reading has been shown to reduce stress and improve mental health. Whether it's fiction or non-fiction, every book offers a unique perspective and learning opportunity.",
  highlightedWords: {
    "fundamental": { meaning: "forming a necessary base or core; of central importance", familiarity: 1 },
    "enhances": { meaning: "intensify, increase, or further improve the quality, value, or extent of", familiarity: 2 },
    "imagination": { meaning: "the faculty or action of forming new ideas, or images or concepts of external objects not present to the senses", familiarity: 3 },
    "vocabulary": { meaning: "the body of words used in a particular language", familiarity: 2 },
    "empathy": { meaning: "the ability to understand and share the feelings of another", familiarity: 1 },
  },
  questions: [
    {
      question: "What is one benefit of reading mentioned in the passage?",
      options: ["Improved physical health", "Reduced stress", "Better eyesight", "Increased wealth"],
      correctAnswer: "Reduced stress"
    },
    {
      question: "According to the passage, reading allows us to:",
      options: ["Travel physically", "Explore new worlds", "Meet famous authors", "Cook better meals"],
      correctAnswer: "Explore new worlds"
    }
  ]
}

export default function Component() {
  const [highlightsVisible, setHighlightsVisible] = useState(true)
  const [selectedWord, setSelectedWord] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const audioRef = useRef(null)

  const handleWordClick = (word: string | React.SetStateAction<null>) => {
    //setSelectedWord(word)
  }

  // const handleFamiliarityChange = (word, familiarity) => {
  //   console.log(`Updating familiarity for ${word} to ${familiarity}`)
  // }

  const handleQuizSubmit = () => {
    setQuizSubmitted(true)
  }

  const renderContent = () => {
    return readingData.content.split(' ').map((word, index) => {
      //const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase()  
      const cleanWord = ""
      //const highlightInfo = readingData.highlightedWords[cleanWord]
      const highlightInfo = ""
      if (highlightInfo && highlightsVisible) {
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className={`cursor-pointer px-1 rounded ${
                    //highlightInfo.familiarity === 1 ? 'bg-red-200' :
                    //highlightInfo.familiarity === 2 ? 'bg-yellow-200' :
                    'bg-green-200'
                  }`}
                  onClick={() => handleWordClick(cleanWord)}
                >
                  {word}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{/*highlightInfo.meaning8*/}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }
      return <span key={index}>{word} </span>
    })
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{readingData.title}</h1>
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
                      //onClick={() => audioRef.current.play()}
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
        <audio ref={audioRef} src="/placeholder.mp3" />
        <Card className="w-full lg:w-1/3 p-4">
          <Tabs defaultValue="words" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="words">Words</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>
            <TabsContent value="words">
              <ScrollArea className="h-[300px] lg:h-[400px]">
                {selectedWord ? (
                  <div>
                    <h2 className="text-xl font-bold mb-2">Word: {selectedWord}</h2>                    
                    <h3 className="font-bold mb-2">Set Familiarity:</h3>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((level) => (
                        <Button 
                          key={level}
                          //onClick={() => handleFamiliarityChange(selectedWord, level)}
                          //variant={readingData.highlightedWords[selectedWord].familiarity === level ? 'default' : 'outline'}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center mt-4">Click on a highlighted word to see its details.</p>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="quiz">
              <ScrollArea className="h-[300px] lg:h-[400px]">
                <div>
                  <h2 className="text-xl font-bold mb-4">Quiz</h2>
                  {readingData.questions.map((q, index) => (
                    <div key={index} className="mb-4">
                      <p className="font-bold mb-2">{q.question}</p>
                      <RadioGroup
                        onValueChange={(value) => setQuizAnswers({...quizAnswers, [index]: value})}
                        //value={quizAnswers[index]}
                      >
                        {q.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`q${index}-option${optionIndex}`} />
                            <Label htmlFor={`q${index}-option${optionIndex}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                      {/* {quizSubmitted && (
                        <p className={quizAnswers[index] === q.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                          {quizAnswers[index] === q.correctAnswer ? 'Correct!' : 'Incorrect'}
                        </p>
                      )} */}
                    </div>
                  ))}
                  <Button onClick={handleQuizSubmit} className="w-full">Submit Answers</Button>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}