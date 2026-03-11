'use client';

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import homepageImage from '@/assets/homepage.png'
import { useLocale } from '@/contexts/locale-context'


export function LandingPageComponent() {
  const router = useRouter()
  const { t } = useLocale()

  const handleRegisterClick = () => {
    router.push('/auth?tab=signup')
  }

  return (
    <section id="sobre-nosotros">
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto py-10 px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="flex flex-col md:flex-row items-center justify-between py-12 md:py-24">
            {/* Left side content */}
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                {t('landing.title')}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {t('landing.subtitle')}
              </p>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 text-lg"
                onClick={handleRegisterClick}
              >
                {t('landing.signup')}
              </Button>
            </div>

            {/* Right side illustration */}
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-lg">
              <Image src={homepageImage} alt={t('landing.imageAlt')} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  )
}

export default LandingPageComponent;