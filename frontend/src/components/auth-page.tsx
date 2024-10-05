"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Language {
  language_id: number;
  language_name: string;
}

export function AuthPageComponent() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [country, setCountry] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [learningLanguage, setLearningLanguage] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/languages');
        setLanguages(response.data);
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };
    fetchLanguages();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(process.env.NEXT_PUBLIC_BACKEND_URL + '/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token);
      setLoginError('');
      router.push('/tablero');
    } catch (error) {
      setLoginError('Invalid email or password');
    }
  };

  const generateUsername = (email: string) => {
    const baseUsername = email.split('@')[0];
    return baseUsername + Math.floor(Math.random() * 10000);
  };

  const handleSignup = async () => {
    try {
      const generatedUsername = generateUsername(email);

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
      });

      localStorage.setItem('token', response.data.token);
      setSignupError('');
      router.push('/tablero');
    } catch (error) {
      setSignupError('Signup failed. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{activeTab === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>{activeTab === 'login' ? 'Enter your credentials to continue' : 'Create a new account'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={togglePasswordVisibility} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
              <Button onClick={handleLogin} className="w-full">Login</Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={togglePasswordVisibility} className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" type="text" required value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="native_language">Native Language</Label>
                <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select native language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((language) => (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="no-languages">No languages available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="learning_language">Learning Language</Label>
                <Select value={learningLanguage} onValueChange={setLearningLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select learning language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 ? (
                      languages.map((language) => (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="no-languages">No languages available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {signupError && <p className="text-red-500 text-sm">{signupError}</p>}
              <Button onClick={handleSignup} className="w-full">Sign Up</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}