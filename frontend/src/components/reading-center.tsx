"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"

const recentSets = [
  { id: 1, title: "Reforzar palabras más débiles" },
  { id: 2, title: "Lectura 1" },
  { id: 3, title: "Lectura 2" },
  { id: 4, title: "Lectura 3" },
  { id: 5, title: "Lectura 4" },
  { id: 6, title: "Lectura 5" },
]

const collectionSets = [
  { id: 1, title: "Set 1" },
  { id: 2, title: "Set 2" },
  { id: 3, title: "Set 3" },
  { id: 4, title: "Set 4" },
  { id: 5, title: "Set 5" },
  { id: 6, title: "Set 6" },
  { id: 7, title: "Set 7" },
  { id: 8, title: "Set 8" },
  { id: 9, title: "Set 9" },
]

export function ReadingCenterComponent() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const setsToShow = 2
  const totalPages = Math.ceil(recentSets.length / setsToShow)

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - setsToShow))
  }, [setsToShow])

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + setsToShow, recentSets.length - setsToShow))
  }, [setsToShow])

  const currentPage = Math.floor(currentIndex / setsToShow)

  return (
    <section id="centro-de-flashcards">
      <div className="container mx-auto p-4 space-y-8">
      <section>
        <h2 className="text-3xl font-bold mb-4">Recientes</h2>
        <div className="relative">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="grid md:grid-cols-2 gap-4 w-full px-12">
              {recentSets.slice(currentIndex, currentIndex + setsToShow).map((set) => (
                <Card key={set.id} className="h-48">
                  <CardHeader>
                    <CardTitle>{set.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">Click to start practicing this set</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
              onClick={handleNext}
              disabled={currentIndex >= recentSets.length - setsToShow}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentPage ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </section>
      
      <section>
        <h2 className="text-3xl font-bold mb-4">Colección</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {collectionSets.map((set) => (
            <Card key={set.id} className="h-40">
              <CardHeader>
                <CardTitle>{set.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Click to view this set</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
    </section>
    
  )
}

export default ReadingCenterComponent