'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Logo from '@/assets/Logo.png';
import UserMenu from '@/hooks/user-menu';
import { useLocale } from '@/contexts/locale-context';

type NavbarProps = {
  isLandingPage?: boolean;
};

const LANDING_NAV = [
  { id: 'sobre-nosotros', key: 'nav.about' },
  { id: 'funciones', key: 'nav.features' },
  { id: 'contacto', key: 'nav.contact' },
];
const PROFILE_NAV = [
  { id: 'tablero', key: 'nav.dashboard' },
  { id: 'perfil', key: 'nav.profile' },
  { id: 'ajustes', key: 'nav.settings' },
];
const MAIN_NAV = [
  { id: 'tablero', key: 'nav.dashboard' },
  { id: 'centro-de-flashcards', key: 'nav.flashcards' },
  { id: 'centro-de-lectura', key: 'nav.reading' },
];

export default function NavbarComponent({ isLandingPage: isLandingPageProp = false }: NavbarProps) {
  const { t } = useLocale();
  const [activeItem, setActiveItem] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/auth');
  const isProfileOrSettings = pathname === '/perfil' || pathname === '/ajustes';
  const isLandingPage = pathname === '/' || isLandingPageProp;

  const navItems = isLandingPage ? LANDING_NAV : isProfileOrSettings ? PROFILE_NAV : MAIN_NAV;

  const scrollToSection = (itemId: string) => {
    if (isLandingPage) {
      const section = document.getElementById(itemId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(`/${itemId}`);
    }
    setActiveItem(itemId);
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
        const section = document.getElementById(item.id);
        if (section) {
          observerRef.current?.observe(section);
        }
      });
    } else {
      // Set active item based on current pathname
      const currentPath = pathname.slice(1); // Remove leading slash
      const matchingItem = navItems.find(item => item.id === currentPath);
      if (matchingItem) {
        setActiveItem(currentPath);
      }
    }

    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const handleAuthChange = (e: CustomEvent<{ loggedIn: boolean }>) => {
      setIsLoggedIn(e.detail.loggedIn);
    };
    window.addEventListener('auth-change', handleAuthChange as EventListener);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('auth-change', handleAuthChange as EventListener);
      if (isLandingPage) {
        observerRef.current?.disconnect();
      }
    };
  }, [navItems, isLandingPage, pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
      bg-background ${isScrolled ? 'py-2' : 'py-4'}
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
            className="dark:invert"
          />
        </Link>
        {!isAuthPage && (
          <>
            <div className="hidden md:flex items-center justify-center flex-grow">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-2 mx-2 rounded-md text-sm font-medium transition-all duration-300
                    ${activeItem === item.id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}
                    ${isScrolled ? 'text-xs' : 'text-sm'}
                  `}
                >
                  {t(item.key)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  <Menu />
                </Button>
              </div>
              {isLoggedIn ? (
                <>
                  {isLandingPage && (
                    <button
                      onClick={() => router.push('/tablero')}
                      className={`hidden md:inline-flex px-3 py-2 mx-2 rounded-md text-sm font-medium transition-all duration-300 text-foreground hover:bg-accent ${isScrolled ? 'text-xs' : 'text-sm'}`}
                    >
                      {t('nav.dashboard')}
                    </button>
                  )}
                  <UserMenu />
                </>
              ) : (
                <Button
                  variant="outline"
                  className={`hidden md:inline-flex ml-4 transition-all duration-300 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-700 hover:text-emerald-700 ${isScrolled ? 'text-xs py-1 px-2' : 'text-sm'}`}
                  onClick={handleLoginClick}
                >
                  {t('common.login')}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      {!isAuthPage && isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b border-border md:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`block w-full text-left px-4 py-2 text-sm
                ${activeItem === item.id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'}
              `}
            >
              {t(item.key)}
            </button>
          ))}
          {isLoggedIn && (
            <>
              {isLandingPage && (
                <button
                  onClick={() => { router.push('/tablero'); setIsMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {t('nav.dashboard')}
                </button>
              )}
              {!isProfileOrSettings && (
                <button
                  onClick={() => { router.push('/perfil'); setIsMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {t('nav.profile')}
                </button>
              )}
            </>
          )}
          {!isLoggedIn && (
            <Button variant="outline" className="w-full mt-2 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-700 hover:text-emerald-700" onClick={handleLoginClick}>
              {t('common.login')}
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
