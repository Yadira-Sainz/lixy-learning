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
import {
  isCognitoEnabled,
  isOAuthConfigured,
  startOAuthRedirect,
  type OAuthProviderId,
  signIn as cognitoSignIn,
  signUp as cognitoSignUp,
  confirmSignUp,
} from "@/lib/cognito"
import { applyLearningDefaultsForNewAccount } from '@/lib/config'

interface Language {
  language_id: number
  language_name: string
}

function GoogleBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function MicrosoftBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" width={18} height={18} aria-hidden>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M1 12h10v10H1z" />
      <path fill="#00a4ef" d="M12 1h10v10H12z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  )
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
  const [oauthLoading, setOauthLoading] = useState<OAuthProviderId | null>(null)

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

  const handleOAuth = async (provider: OAuthProviderId) => {
    setLoginError('')
    setSignupError('')
    try {
      setOauthLoading(provider)
      await startOAuthRedirect(provider)
    } catch (e) {
      setOauthLoading(null)
      setLoginError(e instanceof Error ? e.message : t('auth.oauthFailed'))
    }
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
        applyLearningDefaultsForNewAccount()
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
      const syncRes = await axios.post(
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
      if (syncRes.data?.isNewUser === true) {
        applyLearningDefaultsForNewAccount()
      }
      localStorage.setItem('token', idToken)
      window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }))
      router.push('/tablero')
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : t('auth.signupError'))
    } finally {
      setIsConfirming(false)
    }
  }

  const showOAuth = isCognitoEnabled() && isOAuthConfigured()

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
          {showOAuth && (
            <div className="space-y-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('auth.continueWith')}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full inline-flex items-center justify-center gap-2"
                  disabled={oauthLoading !== null}
                  onClick={() => void handleOAuth('google')}
                >
                  {oauthLoading === 'google' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <GoogleBrandIcon className="shrink-0" />
                  )}
                  {t('auth.google')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full inline-flex items-center justify-center gap-2"
                  disabled={oauthLoading !== null}
                  onClick={() => void handleOAuth('microsoft')}
                >
                  {oauthLoading === 'microsoft' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <MicrosoftBrandIcon className="shrink-0" />
                  )}
                  {t('auth.microsoft')}
                </Button>
              </div>
            </div>
          )}
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
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleLogin()
                }}
              >
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
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                {t('auth.login')}
              </Button>
              </form>
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