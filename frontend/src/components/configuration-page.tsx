'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const sections = [
  { id: 'general', title: 'Configuración General' },
  { id: 'flashcards', title: 'Flashcards' },
  // Add more sections here in the future
]

interface SectionRefs {
  [key: string]: React.RefObject<HTMLElement>;
}

export default function ConfigurationPageComponent() {
  const [dailyGoal, setDailyGoal] = useState('10')
  const [cardsPerSession, setCardsPerSession] = useState('20')
  const [includeTranslation, setIncludeTranslation] = useState(true)
  const [activeSection, setActiveSection] = useState(sections[0].id)
  const sectionRefs = useRef<SectionRefs>({})

  useEffect(() => {
    sections.forEach(section => {
      if (!sectionRefs.current[section.id]) {
        sectionRefs.current[section.id] = React.createRef<HTMLElement>()
      }
    })
  }, [])

  const handleSaveChanges = () => {
    console.log('Changes saved:', { dailyGoal, cardsPerSession, includeTranslation })
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    sectionRefs.current[sectionId]?.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background p-6 flex">
      {/* Navigation sidebar */}
      <nav className="w-64 pr-6 hidden md:block">
        <ul className="space-y-2 fixed">
          {sections.map((section) => (
            <li key={section.id}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${activeSection === section.id ? 'bg-accent' : ''}`}
                onClick={() => scrollToSection(section.id)}
              >
                {section.title}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-grow max-w-2xl mx-auto space-y-8">
        <section ref={sectionRefs.current.general as React.RefObject<HTMLElement>} id="general">
          <h1 className="text-3xl font-bold mb-6">Configuración General</h1>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="theme">Tema</Label>
              <Select>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Selecciona un tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="language">Idioma de interfaz</Label>
              <Select>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Selecciona un idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="daily-goal">Meta de racha diaria</Label>
              <Input 
                id="daily-goal" 
                type="number" 
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section ref={sectionRefs.current.flashcards as React.RefObject<HTMLElement>} id="flashcards">
          <h2 className="text-2xl font-bold mb-6">Flashcards</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cards-per-session">Cartas por sesión</Label>
              <Input 
                id="cards-per-session" 
                type="number"
                value={cardsPerSession}
                onChange={(e) => setCardsPerSession(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="include-translation"
                checked={includeTranslation}
                onCheckedChange={setIncludeTranslation}
              />
              <Label htmlFor="include-translation">Incluir traducción</Label>
            </div>
          </div>
        </section>

        <div className="flex justify-end mt-8">
          <Button onClick={handleSaveChanges}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  )
}