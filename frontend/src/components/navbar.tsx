'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Logo from '@/assets/Logo.png'
import UserMenu from '@/hooks/user-menu';

type NavbarProps = {
  isLandingPage?: boolean;
};

export default function NavbarComponent({ isLandingPage = false }: NavbarProps) {
  const [activeItem, setActiveItem] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth');
  const isProfileOrSettings = pathname === '/perfil' || pathname === '/ajustes';

  const navItems = isLandingPage
    ? ['Sobre nosotros', 'Funciones', 'Contacto']
    : isProfileOrSettings
      ? ['Tablero', 'Perfil', 'Ajustes']
      : ['Tablero', 'Centro de Flashcards', 'Centro de Lectura'];

  const scrollToSection = (sectionId: string) => {
    if (isLandingPage) {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(`/${sectionId}`);
    }
    setActiveItem(sectionId);
    setIsMenuOpen(false);
  };

  const handleLoginClick = () => {
    router.push('/auth?tab=login');
  };

  useEffect(() => {
    const handleResize = () => setIsMenuOpen(false);
    window.addEventListener('resize', handleResize);

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);

    if (isLandingPage) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveItem(entry.target.id);
            }
          });
        },
        { threshold: 0.5 }
      );

      navItems.forEach((item) => {
        const section = document.getElementById(item.toLowerCase().replace(/\s+/g, '-'));
        if (section) {
          observerRef.current?.observe(section);
        }
      });
    } else {
      // Set active item based on current pathname
      const currentPath = pathname.slice(1); // Remove leading slash
      const matchingItem = navItems.find(item => 
        item.toLowerCase().replace(/\s+/g, '-') === currentPath
      );
      if (matchingItem) {
        setActiveItem(currentPath);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (isLandingPage) {
        observerRef.current?.disconnect();
      }
    };
  }, [navItems, isLandingPage, pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
      ${isScrolled ? 'bg-white bg-opacity-80 backdrop-blur-sm py-2' : 'bg-white py-4'}
    `}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className={`font-bold transition-all duration-300 ${isScrolled ? 'text-lg' : 'text-xl'}`}>
          <Image
            src={Logo}
            alt="Website Logo"
            width={isScrolled ? 100 : 120}
            height={isScrolled ? 100 : 120}
            priority
          />
        </Link>
        {!isAuthPage && (
          <>
            <div className="hidden md:flex items-center justify-center flex-grow">
              {navItems.map((item) => {
                const itemId = item.toLowerCase().replace(/\s+/g, '-');
                return (
                  <button
                    key={item}
                    onClick={() => scrollToSection(itemId)}
                    className={`px-3 py-2 mx-2 rounded-md text-sm font-medium transition-all duration-300
                      ${activeItem === itemId ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}
                      ${isScrolled ? 'text-xs' : 'text-sm'}
                    `}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center">
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  <Menu />
                </Button>
              </div>
              {isLandingPage && (
                <Button
                  variant="outline"
                  className={`hidden md:inline-flex ml-4 transition-all duration-300 ${isScrolled ? 'text-xs py-1 px-2' : 'text-sm'}`}
                  onClick={handleLoginClick}
                >
                  Iniciar Sesión
                </Button>
              )}
              {!isLandingPage && (
                <UserMenu />
              )}
            </div>
          </>
        )}
      </div>
      {!isAuthPage && isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white md:hidden">
          {navItems.map((item) => {
            const itemId = item.toLowerCase().replace(/\s+/g, '-');
            return (
              <button
                key={item}
                onClick={() => scrollToSection(itemId)}
                className={`block w-full text-left px-4 py-2 text-sm
                  ${activeItem === itemId ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}
                `}
              >
                {item}
              </button>
            );
          })}
          {!isLandingPage && !isProfileOrSettings && (
            <button
              onClick={() => router.push('/perfil')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Perfil
            </button>
          )}
          {isLandingPage && (
            <Button variant="outline" className="w-full mt-2" onClick={handleLoginClick}>
              Iniciar Sesión
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}