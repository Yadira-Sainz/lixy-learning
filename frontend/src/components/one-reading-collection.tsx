'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/locale-context'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Word = { id: number; word: string; definition: string; };

export default function OneReadingCollection() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [category, setCategory] = useState<string>(t('collection.categoryName'))
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [vocabulary, setVocabulary] = useState<Word[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken)

    const cat = searchParams.get('category') || t('collection.categoryName')
    const catId = searchParams.get('categoryId')
    setCategory(cat)
    setCategoryId(catId)

    if (catId && storedToken) {
      fetchVocabulary(catId, storedToken)
    }
  }, [searchParams, t])

  const fetchVocabulary = async (categoryId: string, token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vocabulary/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setVocabulary(data)
      } else {
        console.error('Failed to fetch vocabulary')
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReadingClick = (index: number) => {
    if (categoryId) {
      console.log(`Navigating to: /leer?categoryId=${categoryId}&readingIndex=${index}`)
      router.push(`/leer?categoryId=${categoryId}&readingIndex=${index}`)
    } else {
      console.error('CategoryId is null, cannot navigate')
    }
  }

  const lecturas = [
    "Lectura 1", "Lectura 2", "Lectura 3", "Lectura 4", "Lectura 5",
    "Lectura 6", "Lectura 7", "Lectura 8", "Lectura 9",
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{category}</h1>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lecturas.map((lectura, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
            onClick={() => handleReadingClick(index)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{lectura}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('collection.clickToView')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  )
}