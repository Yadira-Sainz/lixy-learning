"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from 'next/navigation';

export default function ProfileSectionComponent() {
  const [profileImage, setProfileImage] = useState("/placeholder.svg?height=300&width=300");
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState(''); // New country state
  const [nativeLanguage, setNativeLanguage] = useState(''); 
  const [learningLanguage, setLearningLanguage] = useState('');
  const [languages, setLanguages] = useState([]);

  const router = useRouter(); // For redirecting

  // Fetch user data and available languages
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user data
        const userResponse = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/user/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const user = userResponse.data;
        console.log('User data:', user); // Log user data for debugging

        // Set fetched user details in the form fields
        setFirstName(user.first_name || ''); // Fallback to empty string if undefined
        setLastName(user.last_name || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setAge(user.age || ''); 
        setGender(user.gender || ''); 
        setCountry(user.country || ''); 
        setNativeLanguage(user.native_language_id ? String(user.native_language_id) : ''); 
        setLearningLanguage(user.learning_language_id ? String(user.learning_language_id) : '');

        // Fetch available languages
        const languageResponse = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/languages');
        console.log('Languages:', languageResponse.data); // Log languages data for debugging
        setLanguages(languageResponse.data);
      } catch (error) {
        console.error("Error fetching user data or languages:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const updatedUserInfo = {
      first_name: firstName, // Use first name
      last_name: lastName, // Use last name
      username,
      email,
      password: '', // Add a password field if updating the password
      age: age === "" ? null : age, // Handle age as number or null
      gender,
      country, // Send country
      native_language_id: nativeLanguage,
      learning_language_id: learningLanguage,
    };

    try {
      await axios.put(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/update-user', updatedUserInfo, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      alert("Profile updated successfully!");
      router.push('/tablero'); // Redirect to another page after successful update
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }
  };

  return (
    <section id='perfil' className="min-h-screen bg-background">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 mb-6 md:mb-0">
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4 max-w-[300px] mx-auto">
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <Label htmlFor="profile-image" className="cursor-pointer block text-center">
                <div className="bg-background text-foreground border rounded-full py-2 px-4 inline-block">
                  Change Profile Picture
                </div>
                <Input
                  id="profile-image"
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </Label>
            </div>
            <div className="w-full md:w-2/3 space-y-4">
              <div>
                <Label htmlFor="first-name">First Name</Label>
                <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="last-name">Last Name</Label>
                <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" value={age === "" ? "" : age.toString()} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="native-language">Native Language</Label>
                <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                  <SelectTrigger id="native-language">
                    <SelectValue placeholder="Select your native language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 && languages.map((language: any) => (
                      language.language_id && (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="learning-language">Learning Language</Label>
                <Select value={learningLanguage} onValueChange={setLearningLanguage}>
                  <SelectTrigger id="learning-language">
                    <SelectValue placeholder="Select the language you are learning" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.length > 0 && languages.map((language: any) => (
                      language.language_id && (
                        <SelectItem key={language.language_id} value={String(language.language_id)}>
                          {language.language_name}
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSubmit}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
