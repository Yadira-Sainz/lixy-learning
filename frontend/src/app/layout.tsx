import type { Metadata } from "next";
import "./globals.css";
import NavbarComponent from '@/components/navbar';
import { UnifiedOnboardingTour } from '@/components/unified-onboarding-tour';
import FooterComponent from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/contexts/locale-context";
import InactivityLogout from "@/components/inactivity-logout";

export const metadata: Metadata = {
  title: "LixyLearning",
  description: "Learn languages with LixyLearning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased flex flex-col min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider>
            <InactivityLogout />
            <NavbarComponent />
            <UnifiedOnboardingTour />
            <main className="flex-grow pt-safe">{children}</main>
            <FooterComponent />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}