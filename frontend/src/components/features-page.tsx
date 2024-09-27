'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { BookOpen, Lightbulb, Route } from "lucide-react"

export function FeaturesPageComponent() {
  const features = [
    {
      title: "Flashcards Personalizadas",
      description: "Estudia flashcards con texto y audio, utilizando un algoritmo inteligente de repetición espaciada para optimizar la retención a largo plazo.",
      icon: BookOpen
    },
    {
      title: "Introducción contextual del vocabulario",
      description: "El vocabulario se introduce mediante frases contextuales y lecturas breves, lo que te permite comprender y recordar los nuevos términos con mayor facilidad.",
      icon: Lightbulb
    },
    {
      title: "Rutas de aprendizaje adaptativas",
      description: "Las rutas de aprendizaje se ajustan en función a tus necesidades de aprendizaje.",
      icon: Route
    }
  ]

  return (
    <section id="funciones" className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-12">
          ¿Cuáles son las funciones de LexiLearn?
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-[500px]">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <feature.icon className="w-24 h-24 text-primary stroke-[1.2]" />
              </CardContent>
              <CardFooter>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesPageComponent