'use client';

import { Button } from "@/components/ui/button"
import Navbar from '@/components/navbar'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import homepageImage from '@/assets/homepage.png'


export function LandingPageComponent() {
  const router = useRouter()

  const handleRegisterClick = () => {
    router.push('/auth?tab=signup')
  }

  return (
    <section id="sobre-nosotros">
      <div className="min-h-screen flex flex-col">
        <Navbar isLandingPage={true} />
        <main className="flex-grow container mx-auto py-10 px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="flex flex-col md:flex-row items-center justify-between py-12 md:py-24">
            {/* Left side content */}
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Explora un nuevo idioma
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Creemos que el aprendizaje de idiomas debe ser dinámico y personalizado. ¡Descubre una nueva forma de aprender!
              </p>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 text-lg"
                onClick={handleRegisterClick}
              >
                Regístrate
              </Button>
            </div>

            {/* Right side illustration */}
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-lg">
              <Image src={homepageImage} alt="Idiomas de todo el mundo" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}

export default LandingPageComponent;