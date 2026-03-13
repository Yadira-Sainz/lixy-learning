"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from '@/contexts/locale-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLACEHOLDER_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300' fill='none'%3E%3Crect width='300' height='300' fill='%23e5e7eb'/%3E%3Ccircle cx='150' cy='120' r='50' fill='%239ca3af'/%3E%3Cellipse cx='150' cy='260' rx='90' ry='60' fill='%239ca3af'/%3E%3C/svg%3E";

export default function ProfileSectionComponent() {
  const { t } = useLocale();
  const [profileImage, setProfileImage] = useState(PLACEHOLDER_AVATAR);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState(''); 
  const [learningLanguage, setLearningLanguage] = useState('');
  const [languages, setLanguages] = useState([]);

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
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setAge(user.age || ''); 
        setGender(user.gender || ''); 
        setCountry(user.country || ''); 
        setNativeLanguage(user.native_language_id ? String(user.native_language_id) : ''); 
        setLearningLanguage(user.learning_language_id ? String(user.learning_language_id) : '');
        const profilePath = user.profile_image_url?.includes('/')
          ? user.profile_image_url
          : user.profile_image_url
            ? `profiles/${user.profile_image_url}`
            : null;
        const imgUrl = profilePath
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${profilePath}`
          : PLACEHOLDER_AVATAR;
        setProfileImage(imgUrl);

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

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (profileImageFile) {
        const formData = new FormData();
        formData.append('image', profileImageFile);
        await axios.post(
          process.env.NEXT_PUBLIC_BACKEND_URL + '/api/upload-profile-image',
          formData,
          { headers }
        );
      }

      const updatedUserInfo = {
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        password: '',
        age: age === "" ? null : age,
        gender,
        country,
        native_language_id: nativeLanguage,
        learning_language_id: learningLanguage,
      };

      await axios.put(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/update-user', updatedUserInfo, {
        headers,
      });
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setSaveError(false);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveFeedback(false);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 5000);
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
                  {t('profile.changePhoto')}
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
                <Label htmlFor="first-name">{t('profile.firstName')}</Label>
                <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="last-name">{t('profile.lastName')}</Label>
                <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="username">{t('profile.username')}</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="age">{t('profile.age')}</Label>
                <Input id="age" type="number" value={age === "" ? "" : age.toString()} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="gender">{t('profile.gender')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder={t('profile.genderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t('auth.male')}</SelectItem>
                    <SelectItem value="Female">{t('auth.female')}</SelectItem>
                    <SelectItem value="Other">{t('auth.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="country">{t('profile.country')}</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="native-language">{t('profile.nativeLanguage')}</Label>
                <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                  <SelectTrigger id="native-language">
                    <SelectValue placeholder={t('profile.nativeLanguagePlaceholder')} />
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
                <Label htmlFor="learning-language">{t('profile.learningLanguage')}</Label>
                <Select value={learningLanguage} onValueChange={setLearningLanguage}>
                  <SelectTrigger id="learning-language">
                    <SelectValue placeholder={t('profile.learningLanguagePlaceholder')} />
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
              <div className="flex justify-end items-center gap-4">
                {saveFeedback && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium animate-in fade-in duration-200">
                    {t('profile.updateSuccess')}
                  </span>
                )}
                {saveError && (
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium animate-in fade-in duration-200">
                    {t('profile.updateFailed')}
                  </span>
                )}
                <Button onClick={handleSubmit}>{t('profile.saveChanges')}</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}
