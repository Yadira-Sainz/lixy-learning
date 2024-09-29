'use client'

import exp from 'constants'
import { Facebook, Twitter, Instagram } from 'lucide-react'

export function FooterComponent() {
  return (
    <footer className="bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">LixyLearning</h2>
            <p className="mt-2 text-sm text-gray-600">© 2024 LixyLearning. Todos los derechos reservados.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Redes sociales</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Facebook</span>
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
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