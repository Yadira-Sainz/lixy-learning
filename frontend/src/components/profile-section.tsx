"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProfileSectionComponent() {
  const [profileImage, setProfileImage] = useState("/placeholder.svg?height=300&width=300")

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <section id='perfil' className="min-h-screen bg-background">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 mb-6 md:mb-0">
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4 max-w-[300px] mx-auto">
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <Label htmlFor="profile-image" className="cursor-pointer block text-center">
                <div className="bg-background text-foreground border rounded-full py-2 px-4 inline-block">
                  Cambiar foto de perfil
                </div>
                <Input 
                  id="profile-image" 
                  type="file" 
                  className="hidden" 
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </Label>
            </div>
            <div className="w-full md:w-2/3 space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" />
              </div>
              <div>
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input id="username" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" />
              </div>
              <div>
                <Label htmlFor="language">Idioma</Label>
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
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex justify-end">
                <Button>Guardar cambios</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  )
}