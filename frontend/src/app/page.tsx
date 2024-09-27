import LandingPage from '@/components/landing-page'
import Navbar from '@/components/navbar'
import FeaturesPage from '@/components/features-page'
import ContactPage from '@/components/contact-page'
import Footer from '@/components/footer'

export default function Home() {
  return(
    <div>
      <LandingPage/>
      <FeaturesPage/>
      <ContactPage/>
    </div>
);
}