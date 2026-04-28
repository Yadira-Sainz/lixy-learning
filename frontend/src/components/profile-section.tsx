"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocale } from '@/contexts/locale-context';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EyeIcon, EyeOffIcon, KeyRound, Mail } from 'lucide-react';
import { COUNTRIES, getCountryDisplayValue } from "@/lib/countries";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordErrorField, setPasswordErrorField] = useState<'current' | 'new' | 'confirm' | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [emailChangeDialogOpen, setEmailChangeDialogOpen] = useState(false);
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailChangePasswordError, setEmailChangePasswordError] = useState('');
  const [showEmailChangePassword, setShowEmailChangePassword] = useState(false);

  // Fetch user data and available languages
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
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
        const userEmail = user.email || '';
        setEmail(userEmail);
        setOriginalEmail(userEmail);
        setAge(user.age || ''); 
        setGender(user.gender || ''); 
        setCountry(getCountryDisplayValue(user.country || '') || user.country || ''); 
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const performSave = async (currentPasswordForEmail?: string) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    setIsSaving(true);
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

      const updatedUserInfo: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        age: age === "" ? null : age,
        gender,
        country,
        native_language_id: nativeLanguage,
        learning_language_id: learningLanguage,
      };
      if (currentPasswordForEmail) {
        updatedUserInfo.current_password = currentPasswordForEmail;
      }

      await axios.put(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/update-user', updatedUserInfo, {
        headers,
      });
      window.dispatchEvent(new CustomEvent('profile-updated'));
      setSaveError(false);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 3000);
      setOriginalEmail(email);
      setEmailChangeDialogOpen(false);
      setEmailChangePassword('');
      setEmailChangePasswordError('');
    } catch (error) {
      console.error("Error updating profile:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401 && currentPasswordForEmail) {
        setEmailChangePasswordError(t('profile.currentPasswordWrong'));
      } else {
        setSaveFeedback(false);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 5000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (email.trim() !== originalEmail.trim()) {
      setEmailChangePassword('');
      setEmailChangePasswordError('');
      setShowEmailChangePassword(false);
      setEmailChangeDialogOpen(true);
      return;
    }
    await performSave();
  };

  const handleEmailChangeConfirm = async () => {
    if (!emailChangePassword.trim()) {
      setEmailChangePasswordError(t('profile.fillRequiredFields'));
      return;
    }
    await performSave(emailChangePassword);
  };

  if (isLoading) {
    return (
      <section id='perfil' className="min-h-screen bg-background">
        <main className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 mb-6 md:mb-0">
                <Skeleton className="aspect-square max-w-[300px] mx-auto rounded-lg mb-4" />
              </div>
              <div className="w-full md:w-2/3 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <div className="flex justify-center py-8 text-muted-foreground">
                  {t('profile.loading')}
                </div>
              </div>
            </div>
          </div>
        </main>
      </section>
    );
  }

  return (
    <section id='perfil' className="min-h-screen bg-background">
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 mb-6 md:mb-0">
              <div className="aspect-square bg-white rounded-lg overflow-hidden mb-4 max-w-[300px] mx-auto">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover filter-none"
                  style={{ filter: "none" }}
                />
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
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder={t('profile.countryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                    {country && !COUNTRIES.some((c) => c.name === country) && (
                      <SelectItem value={country}>{country}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
              {passwordChangeSuccess && (
                <div className="rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200 font-medium animate-in fade-in duration-200">
                  {t('profile.passwordChangedSuccess')}
                </div>
              )}
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordDialogOpen(true);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setPasswordErrorField(null);
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {t('profile.changePassword')}
                </Button>
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
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                  {t('profile.saveChanges')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setPasswordErrorField(null);
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {t('profile.changePassword')}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPasswordError('');
              setPasswordErrorField(null);
              if (!currentPassword.trim()) {
                setPasswordError(t('profile.fillRequiredFields'));
                setPasswordErrorField('current');
                return;
              }
              if (!newPassword.trim()) {
                setPasswordError(t('profile.fillRequiredFields'));
                setPasswordErrorField('new');
                return;
              }
              if (!confirmPassword.trim()) {
                setPasswordError(t('profile.fillRequiredFields'));
                setPasswordErrorField('confirm');
                return;
              }
              if (newPassword.length < 6) {
                setPasswordError(t('auth.passwordMinLength'));
                setPasswordErrorField('new');
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordError(t('profile.passwordMismatch'));
                setPasswordErrorField('confirm');
                return;
              }
              try {
                await axios.post(
                  process.env.NEXT_PUBLIC_BACKEND_URL + '/api/change-password',
                  { current_password: currentPassword, new_password: newPassword },
                  { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setPasswordDialogOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordChangeSuccess(true);
                setTimeout(() => setPasswordChangeSuccess(false), 4000);
              } catch (err: unknown) {
                const msg = axios.isAxiosError(err) && err.response?.status === 401
                  ? t('profile.currentPasswordWrong')
                  : t('profile.updateFailed');
                setPasswordError(msg);
                setPasswordErrorField('current');
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="current-password">{t('profile.currentPassword')}</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrorField(null); }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  aria-invalid={passwordErrorField === 'current'}
                  aria-describedby={passwordErrorField === 'current' ? 'current-password-error' : undefined}
                  className={passwordErrorField === 'current' ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrorField === 'current' && passwordError && (
                <p id="current-password-error" className="text-sm text-red-600 dark:text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="new-password-dialog">{t('profile.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="new-password-dialog"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrorField(null); }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  aria-invalid={passwordErrorField === 'new'}
                  aria-describedby={passwordErrorField === 'new' ? 'new-password-error' : undefined}
                  className={passwordErrorField === 'new' ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrorField === 'new' && passwordError && (
                <p id="new-password-error" className="text-sm text-red-600 dark:text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm-password-dialog">{t('profile.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirm-password-dialog"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrorField(null); }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  aria-invalid={passwordErrorField === 'confirm'}
                  aria-describedby={passwordErrorField === 'confirm' ? 'confirm-password-error' : undefined}
                  className={passwordErrorField === 'confirm' ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrorField === 'confirm' && passwordError && (
                <p id="confirm-password-error" className="text-sm text-red-600 dark:text-red-400 mt-1">{passwordError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">{t('profile.saveChanges')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={emailChangeDialogOpen}
        onOpenChange={(open) => {
          setEmailChangeDialogOpen(open);
          if (!open) {
            setEmailChangePassword('');
            setEmailChangePasswordError('');
            setShowEmailChangePassword(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('profile.emailChangeConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('profile.emailChangeConfirmMessage')}</p>
            <p className="text-sm font-medium">
              {originalEmail} → {email}
            </p>
          </div>
          <div>
            <Label htmlFor="email-change-password">{t('profile.currentPassword')}</Label>
            <div className="relative">
              <Input
                id="email-change-password"
                type={showEmailChangePassword ? 'text' : 'password'}
                value={emailChangePassword}
                onChange={(e) => { setEmailChangePassword(e.target.value); setEmailChangePasswordError(''); }}
                autoComplete="off"
                data-lpignore="true"
                placeholder={t('profile.currentPassword')}
                className={emailChangePasswordError ? 'border-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setShowEmailChangePassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showEmailChangePassword ? 'Hide password' : 'Show password'}
              >
                {showEmailChangePassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {emailChangePasswordError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{emailChangePasswordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEmailChangeDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEmailChangeConfirm} disabled={isSaving}>
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('profile.confirmEmailChange')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
