"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { useLocale } from '@/contexts/locale-context'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COUNTRIES } from "@/lib/countries"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { isCognitoEnabled, signIn as cognitoSignIn, signUp as cognitoSignUp, confirmSignUp } from "@/lib/cognito"

interface Language {
  language_id: number
  language_name: string
}

export default function AuthPageComponent() {
  const { t } = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [pendingSignupData, setPendingSignupData] = useState<{
    username: string
    firstName: string
    lastName: string
    age: string
    gender: string
    country: string
    nativeLanguage: string
    learningLanguage: string
  } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [languages, setLanguages] = useState<Language[]>([])

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/languages')
        setLanguages(response.data)
      } catch (error) {
        console.error("Error fetching languages:", error)
      }
    }
    fetchLanguages()
  }, [])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setLoginError(t('auth.fillAllFields'))
      return
    }
    setIsLoggingIn(true)
    setLoginError('')
    try {
      if (isCognitoEnabled()) {
        try {
          const idToken = await cognitoSignIn(email, password)
          localStorage.setItem('token', idToken)
          window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
          router.push('/tablero')
          return
        } catch (cognitoErr) {
          try {
            const response = await axios.post(process.env.NEXT_PUBLIC_BACKEND_URL + '/login', { email, password })
            localStorage.setItem('token', response.data.token)
            window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
            router.push('/tablero')
            return
          } catch {
            throw cognitoErr
          }
        }
      } else {
        const response = await axios.post(process.env.NEXT_PUBLIC_BACKEND_URL + '/login', { email, password })
        localStorage.setItem('token', response.data.token)
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
        router.push('/tablero')
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : t('auth.invalidCredentials'))
    } finally {
      setIsLoggingIn(false)
    }
  }

  const generateUsername = (email: string) => {
    const baseUsername = email.split('@')[0]
    return baseUsername + Math.floor(Math.random() * 10000)
  }

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password || !age || !gender || !country || !nativeLanguage || !learningLanguage) {
      setSignupError(t('auth.fillAllFields'))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignupError(t('auth.invalidEmail'))
      return
    }

    if (password.length < 6) {
      setSignupError(t('auth.passwordMinLength'))
      return
    }

    if (isCognitoEnabled() && !/[A-Z]/.test(password)) {
      setSignupError(t('auth.passwordNeedsUppercase'))
      return
    }

    if (isNaN(Number(age)) || Number(age) <= 0) {
      setSignupError(t('auth.invalidAge'))
      return
    }

    setIsSigningUp(true)
    setSignupError('')
    try {
      if (isCognitoEnabled()) {
        await cognitoSignUp(email, password, { given_name: firstName, family_name: lastName })
        setPendingSignupData({
          username: generateUsername(email),
          firstName,
          lastName,
          age,
          gender,
          country,
          nativeLanguage,
          learningLanguage,
        })
        setShowVerification(true)
      } else {
        const generatedUsername = generateUsername(email)
        const response = await axios.post(process.env.NEXT_PUBLIC_BACKEND_URL + '/register', {
          username: generatedUsername,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          age,
          gender,
          country,
          native_language: nativeLanguage,
          learning_language: learningLanguage,
        })
        localStorage.setItem('token', response.data.token)
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
        router.push('/tablero')
      }
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : t('auth.signupError'))
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleConfirmVerification = async () => {
    if (!verificationCode.trim()) {
      setSignupError(t('auth.fillAllFields'))
      return
    }
    if (!pendingSignupData) return
    setIsConfirming(true)
    setSignupError('')
    try {
      await confirmSignUp(email, verificationCode.trim())
      const idToken = await cognitoSignIn(email, password)
      await axios.post(
        process.env.NEXT_PUBLIC_BACKEND_URL + '/api/cognito/sync-profile',
        {
          username: pendingSignupData.username,
          first_name: pendingSignupData.firstName,
          last_name: pendingSignupData.lastName,
          age: Number(pendingSignupData.age) || undefined,
          gender: pendingSignupData.gender || undefined,
          country: pendingSignupData.country || undefined,
          native_language: Number(pendingSignupData.nativeLanguage),
          learning_language: Number(pendingSignupData.learningLanguage),
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
      localStorage.setItem('token', idToken)
      window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
      router.push('/tablero')
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : t('auth.signupError'))
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{activeTab === 'login' ? t('auth.login') : t('auth.signup')}</CardTitle>
          <CardDescription>
            {activeTab === 'login' ? t('auth.loginDesc') : t('auth.signupDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="login"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t('auth.login')}
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t('auth.signup')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={togglePasswordVisibility} 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {t('auth.login')}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              {showVerification ? (
                <>
                  <p className="text-sm text-muted-foreground">{t('auth.verificationCodeSent')}</p>
                  <div className="space-y-2">
                    <Label htmlFor="verification_code">{t('auth.enterVerificationCode')}</Label>
                    <Input
                      id="verification_code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                    />
                  </div>
                  {signupError && <p className="text-red-500 text-sm">{signupError}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setShowVerification(false); setPendingSignupData(null); setSignupError(''); }} disabled={isConfirming}>
                      {t('auth.back')}
                    </Button>
                    <Button onClick={handleConfirmVerification} disabled={isConfirming} className="flex-1">
                      {isConfirming ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                      {t('auth.verify')}
                    </Button>
                  </div>
                </>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t('auth.firstName')}</Label>
                  <Input id="first_name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">{t('auth.lastName')}</Label>
                  <Input id="last_name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button 
                    type="button" 
                    onClick={togglePasswordVisibility} 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">{t('auth.age')}</Label>
                  <Input id="age" type="number" value={age} onChange={(e) => {
                    const numericValue = e.target.value.replace(/\D/g, '')
                    setAge(numericValue)
                  }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">{t('auth.gender')}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('auth.genderPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">{t('auth.male')}</SelectItem>
                      <SelectItem value="Femenino">{t('auth.female')}</SelectItem>
                      <SelectItem value="Otro">{t('auth.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('auth.country')}</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder={t('auth.countryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="native_language">{t('auth.nativeLanguage')}</Label>
                <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('auth.nativeLanguagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((language) => (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="no-languages">{t('auth.noLanguages')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="learning_language">{t('auth.learningLanguage')}</Label>
                <Select value={learningLanguage} onValueChange={setLearningLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('auth.learningLanguagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((language) => (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="no-languages">{t('auth.noLanguages')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {signupError && <p className="text-red-500 text-sm">{signupError}</p>}
              <Button onClick={handleSignup} className="w-full" disabled={isSigningUp}>
                {isSigningUp ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {t('auth.signup')}
              </Button>
              </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}