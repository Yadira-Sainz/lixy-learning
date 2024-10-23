"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Story = { story_id: number | string; title: string; };

export default function OneReadingCollection() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [category, setCategory] = useState<string>('Nombre de categoría')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setToken(storedToken)

    const cat = searchParams.get('category') || 'Nombre de categoría'
    const catId = searchParams.get('categoryId')
    setCategory(cat)
    setCategoryId(catId)

    if (catId && storedToken) {
      fetchStories(catId, storedToken)
    }
  }, [searchParams])

  const fetchStories = async (categoryId: string, token: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stories/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setStories(data)
      } else {
        console.error('Failed to fetch stories')
        setError('Failed to fetch stories')
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
      setError('Error fetching stories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReadingClick = (storyId: number | string) => {
    if (categoryId) {
      console.log(`Navigating to: /leer?categoryId=${categoryId}&storyId=${storyId}`)
      router.push(`/leer?categoryId=${categoryId}&storyId=${storyId}`)
    } else {
      console.error('CategoryId is null, cannot navigate')
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{category}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <Card 
            key={story.story_id} 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
            onClick={() => handleReadingClick(story.story_id)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{story.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Haga clic para ver esta lectura</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}