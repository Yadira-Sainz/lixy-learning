"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from 'next/navigation';

const recentSets = [
  { id: 1, title: "Reforzar palabras más débiles" },
  { id: 2, title: "Set 1" },
  { id: 3, title: "Set 2" },
  { id: 4, title: "Set 3" },
  { id: 5, title: "Set 4" },
  { id: 6, title: "Set 5" },
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

// Definición de tipos para las categorías y vocabulario
interface Category {
  category_id: number;
  category_name: string;
}

interface Vocabulary {
  id: number;
  word: string;
  definition: string;
}

export function FlashcardCenter() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [vocabularySets, setVocabularySets] = useState<Record<number, Vocabulary[]>>({});
  const [currentCategory, setCurrentCategory] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const setsToShow = 2;
  const router = useRouter()

  useEffect(() => {
    fetchCategories();
  }, []);


  const handleCategoryClick = (categoryId: number) => {
      // Navigate to the flashcard page with the category ID
      router.push(`/flashcard/${categoryId}`);
    };

  const fetchCategories = async () => {
    const token = localStorage.getItem('token'); // Obtener el token almacenado
    const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/categories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Incluir el token en el encabezado
      },
    });

    if (response.ok) {
      const data: Category[] = await response.json();
      setCategories(data);
    } else {
      console.error("Failed to fetch categories", response.status);
    }
  };

  const fetchVocabularyByCategory = async (categoryId: number) => {
    const token = localStorage.getItem('token'); // Obtener el token almacenado
    const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + `/api/vocabulary/${categoryId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Incluir el token en el encabezado
      },
    });

    if (response.ok) {
      const data: Vocabulary[] = await response.json();
      setVocabularySets((prev) => ({ ...prev, [categoryId]: data }));
      setCurrentCategory(categoryId);
      setCurrentIndex(0);
    } else {
      console.error("Failed to fetch vocabulary", response.status);
    }
  };

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - setsToShow));
  }, [setsToShow]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (currentCategory !== null) {
        return Math.min(prevIndex + setsToShow, vocabularySets[currentCategory]?.length - setsToShow);
      }
      return prevIndex; // Mantener el índice anterior si currentCategory es null
    });
  }, [setsToShow, currentCategory, vocabularySets]);

  const totalPages = currentCategory ? Math.ceil((vocabularySets[currentCategory]?.length || 0) / setsToShow) : 0;
  const currentPage = Math.floor(currentIndex / setsToShow);

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
                    <p className="text-sm text-gray-500">Haz clic para empezar a practicar</p>
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
            {categories.map((category) => (
              <Card key={category.category_id} className="h-40" onClick={() => handleCategoryClick(category.category_id)}>
                <CardHeader>
                  <CardTitle>{category.category_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Haz click para ver esta categoría</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {currentCategory && (
          <section>
            <h2 className="text-3xl font-bold mb-4">Vocabulario - {categories.find(c => c.category_id === currentCategory)?.category_name}</h2>
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
                  {vocabularySets[currentCategory]?.slice(currentIndex, currentIndex + setsToShow).map((vocab) => (
                    <Card key={vocab.id} className="h-48">
                      <CardHeader>
                        <CardTitle>{vocab.word}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500">{vocab.definition}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
                  onClick={handleNext}
                  disabled={currentIndex >= (vocabularySets[currentCategory]?.length - setsToShow)}
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
        )}
      </div>
    </section>
  );
}

export default FlashcardCenter;
