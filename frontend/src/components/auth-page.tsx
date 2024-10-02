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

// Define the type for a language
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
  const [gender, setGender] = useState('Male'); // Default selection for gender
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
    // Simple username generation from email
    const baseUsername = email.split('@')[0];
    return baseUsername + Math.floor(Math.random() * 10000); // Add random digits to ensure uniqueness
  };

  const handleSignup = async () => {
    try {
      const generatedUsername = generateUsername(email); // Use generated username

      const response = await axios.post(process.env.NEXT_PUBLIC_BACKEND_URL + '/register', {
        username: generatedUsername, // Generated username
        first_name: firstName, // Separate first name
        last_name: lastName, // Separate last name
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
    <div className="flex justify-center items-center h-screen">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>{activeTab === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>{activeTab === 'login' ? 'Enter your credentials to continue' : 'Create a new account'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={togglePasswordVisibility} className="absolute right-2 top-2">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {loginError && <p className="text-red-500">{loginError}</p>}
              <Button onClick={handleLogin}>Login</Button>
            </TabsContent>
            <TabsContent value="signup">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={togglePasswordVisibility} className="absolute right-2 top-2">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} />
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
              <Label htmlFor="country">Country</Label>
              <Input id="country" type="text" required value={country} onChange={(e) => setCountry(e.target.value)} />

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

              {signupError && <p className="text-red-500">{signupError}</p>}
              <Button onClick={handleSignup}>Sign Up</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
