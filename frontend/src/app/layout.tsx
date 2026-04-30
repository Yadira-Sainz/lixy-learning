import type { Metadata } from "next";
import "./globals.css";
import NavbarComponent from '@/components/navbar';
import { UnifiedOnboardingTour } from '@/components/unified-onboarding-tour';
import FooterComponent from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/contexts/locale-context";
import InactivityLogout from "@/components/inactivity-logout";
import SessionKeepAlive from "@/components/session-keepalive";

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
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
            <SessionKeepAlive />
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