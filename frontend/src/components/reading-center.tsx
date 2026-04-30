"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from '@/contexts/locale-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react"
import { CollectionCategoryCard } from "@/components/collection-category-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRequireAuth } from "@/hooks/use-require-auth"
const recentSets = [
  { id: 1, titleKey: "readingCenter.reinforceWeak", mode: "weak" as const },
  { id: 2, titleKey: null, readingNum: 1, mode: "set" as const },
  { id: 3, titleKey: null, readingNum: 2, mode: "set" as const },
  { id: 4, titleKey: null, readingNum: 3, mode: "set" as const },
  { id: 5, titleKey: null, readingNum: 4, mode: "set" as const },
  { id: 6, titleKey: null, readingNum: 5, mode: "set" as const },
]

interface Category {
  category_id: number;
  category_name: string;
}

export function ReadingCenterComponent() {
  const { t } = useLocale()
  const router = useRouter()
  const { isChecking, isAuthorized } = useRequireAuth()
  const [categories, setCategories] = useState<Category[]>([]);
  const [weakCategoryId, setWeakCategoryId] = useState<number | null>(null);
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lixy-tour-resync-anchor'))
      }
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }
    fetchCategories();
    fetchWeakCategory();
  }, [isAuthorized]);

  const fetchWeakCategory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/weak-category`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: { categoryId?: number | null } = await response.json();
        setWeakCategoryId(data.categoryId ?? null);
      }
    } catch (err) {
      console.error('Failed to fetch weak category', err);
    }
  };

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

  const navigateToReading = (categoryId: number, readingNumber: number, mode?: "weak") => {
    const params = new URLSearchParams({
      categoryId: String(categoryId),
      readingIndex: String(Math.max(readingNumber - 1, 0)),
    });
    if (mode === "weak") {
      params.set("mode", "weak");
    }
    router.push(`/leer?${params.toString()}`);
  };

  const getCategoryByReadingNumber = (readingNum: number): Category | null => {
    if (!categories.length) {
      return null;
    }
    const ordered = [...categories].sort((a, b) => a.category_id - b.category_id);
    return ordered[readingNum - 1] ?? ordered.find((c) => c.category_id === readingNum) ?? null;
  };

  const handleRecentCardClick = (set: (typeof recentSets)[number]) => {
    if (set.mode === "weak") {
      const fallbackCategory = categories[0] ?? null;
      const weakCategory = categories.find((c) => c.category_id === weakCategoryId) ?? null;
      const targetCategory = weakCategory ?? fallbackCategory;
      if (targetCategory) {
        navigateToReading(targetCategory.category_id, 1, "weak");
      }
      return;
    }
    const targetCategory = getCategoryByReadingNumber(set.readingNum);
    if (targetCategory) {
      navigateToReading(targetCategory.category_id, set.readingNum);
    }
  };

  return (
    <section id="centro-de-lectura">
      <div className="container mx-auto p-4 space-y-8">
        {isChecking ? (
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : !isAuthorized ? null : (
          <>
        <section data-tour="rc-recent">
          <h2 className="text-3xl font-bold mb-4">{t('readingCenter.recent')}</h2>
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
                  <Card
                    key={set.id}
                    className="relative h-48 cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => handleRecentCardClick(set)}
                  >
                    <span className="absolute right-4 top-4 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-background text-primary">
                      <BookOpen className="h-3.5 w-3.5" />
                    </span>
                    <CardHeader>
                      <CardTitle>
                        {set.titleKey ? t(set.titleKey) : `${t('readingCenter.reading')} ${(set as { readingNum: number }).readingNum}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">{t('readingCenter.clickToPractice')}</p>
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
        
        <section data-tour="rc-categories">
          <h2 className="text-3xl font-bold mb-4">{t('readingCenter.collection')}</h2>
          {isLoading ? (
            <p>{t('readingCenter.loadingCategories')}</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {categories.map((category) => (
                <CollectionCategoryCard
                  key={category.category_id}
                  categoryId={category.category_id}
                  categoryName={category.category_name}
                  hint={t('readingCenter.clickToViewCategory')}
                  onClick={() => handleCategoryClick(category.category_id, category.category_name)}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </section>
  )
}

export default ReadingCenterComponent