'use client'

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { BookOpen, Lightbulb, Route } from "lucide-react"
import { useLocale } from '@/contexts/locale-context'

export function FeaturesPageComponent() {
  const { t } = useLocale()

  const features = [
    {
      titleKey: "features.flashcards.title",
      descriptionKey: "features.flashcards.description",
      icon: BookOpen
    },
    {
      titleKey: "features.vocabulary.title",
      descriptionKey: "features.vocabulary.description",
      icon: Lightbulb
    },
    {
      titleKey: "features.routes.title",
      descriptionKey: "features.routes.description",
      icon: Route
    }
  ]

  return (
    <section id="funciones" className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground text-center mb-12">
          {t('features.title')}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-[500px]">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-card-foreground">{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center justify-center">
                <feature.icon className="w-24 h-24 text-primary stroke-[1.2]" />
              </CardContent>
              <CardFooter>
                <p className="text-muted-foreground text-sm">{t(feature.descriptionKey)}</p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesPageComponent