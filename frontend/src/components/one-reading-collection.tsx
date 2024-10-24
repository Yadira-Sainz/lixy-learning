'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Story = { story_id: string | number; title: string; };

export default function OneReadingCollection() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [category, setCategory] = useState<string>('Nombre de categoría')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [token, setToken] = useState<string | null>(null)

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stories/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        // Add a placeholder story at the end
        setStories([...data, { story_id: `placeholder-${data.length + 1}`, title: `Nueva Lectura` }])
      } else {
        console.error('Failed to fetch stories')
      }
    } catch (error) {
      console.error('Error fetching stories:', error)
    }
  }

  const handleReadingClick = async (storyId: string | number) => {
    if (categoryId && token) {
      if (typeof storyId === 'string' && storyId.startsWith('placeholder-')) {
        // Generate a new story
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/story/${storyId}?categoryId=${categoryId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (response.ok) {
            const newStory = await response.json()
            setStories(prevStories => {
              const updatedStories = prevStories.filter(story => story.story_id !== storyId)
              return [...updatedStories, { story_id: newStory.story_id, title: newStory.title }, { story_id: `placeholder-${updatedStories.length + 1}`, title: 'Nueva Lectura' }]
            })
            router.push(`/leer?categoryId=${categoryId}&storyId=${newStory.story_id}`)
          } else {
            console.error('Failed to generate new story')
          }
        } catch (error) {
          console.error('Error generating new story:', error)
        }
      } else {
        // Navigate to existing story
        router.push(`/leer?categoryId=${categoryId}&storyId=${storyId}`)
      }
    } else {
      console.error('CategoryId or token is null, cannot navigate')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{category}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story, index) => (
          <Card 
            key={story.story_id} 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
            onClick={() => handleReadingClick(story.story_id)}
          >
            <CardHeader>
              <CardTitle className="text-xl">{story.title || `Lectura ${index + 1}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {typeof story.story_id === 'string' && story.story_id.startsWith('placeholder-')
                  ? 'Haga clic para generar una nueva lectura'
                  : 'Haga clic para ver esta lectura'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}