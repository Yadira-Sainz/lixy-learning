"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
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

interface Category {
  category_id: number;
  category_name: string;
}

export function ReadingCenterComponent() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setsToShow = 2
  const totalPages = Math.ceil(recentSets.length / setsToShow)

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: Category[] = await response.json();
        setCategories(data);
      } else {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - setsToShow))
  }, [setsToShow])

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.min(prevIndex + setsToShow, recentSets.length - setsToShow))
  }, [setsToShow])

  const currentPage = Math.floor(currentIndex / setsToShow)

  const handleCategoryClick = (categoryId: number, categoryName: string) => {
    router.push(`/coleccion?categoryId=${categoryId}&category=${encodeURIComponent(categoryName)}`)
  }

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
          {isLoading ? (
            <p>Loading categories...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card 
                  key={category.category_id} 
                  className="h-40 cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  onClick={() => handleCategoryClick(category.category_id, category.category_name)}
                >
                  <CardHeader>
                    <CardTitle>{category.category_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">Click to view this category</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default ReadingCenterComponent