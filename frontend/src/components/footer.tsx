'use client'

import { Facebook, Twitter, Instagram } from 'lucide-react'
import { useLocale } from '@/contexts/locale-context'

export function FooterComponent() {
  const { t } = useLocale()

  return (
    <footer className="bg-background border-t border-border py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('footer.brand')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('footer.copyright')}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('footer.social')}</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterComponent;