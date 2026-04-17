import * as React from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings, User, LogOut, Zap, LayoutDashboard } from "lucide-react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/locale-context';
import { useAdminAccess } from '@/hooks/use-admin-access';

export default function UserMenu() {
  const { t } = useLocale();
  const { isAdmin } = useAdminAccess();
  const [userDetails, setUserDetails] = React.useState({ username: '', email: '', points: 0, profile_image_url: '' as string | null });
  const [imgError, setImgError] = React.useState(false);
  const [imgCacheBuster, setImgCacheBuster] = React.useState(0);
  const router = useRouter();

  const fetchUserDetails = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(process.env.NEXT_PUBLIC_BACKEND_URL + '/user-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDetails({
        ...response.data,
        points: response.data.points ?? 0,
        profile_image_url: response.data.profile_image_url ?? null,
      });
      setImgCacheBuster((v) => v + 1);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }, []);

  React.useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  React.useEffect(() => {
    setImgError(false);
  }, [userDetails.profile_image_url, userDetails.username]);

  React.useEffect(() => {
    const onProfileUpdated = () => fetchUserDetails();
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, [fetchUserDetails]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: false } }));
    router.push('/auth?tab=login');
  };

  const initial = userDetails.username ? userDetails.username.charAt(0).toUpperCase() : '?';
  const hasProfileImage = Boolean(
    userDetails.profile_image_url &&
    typeof userDetails.profile_image_url === 'string' &&
    userDetails.profile_image_url.trim().length > 0 &&
    !userDetails.profile_image_url.toLowerCase().includes('placeholder')
  );
  const profilePath = hasProfileImage && userDetails.profile_image_url
    ? (userDetails.profile_image_url.includes('/') ? userDetails.profile_image_url : `profiles/${userDetails.profile_image_url}`)
    : null;
  const profileImageUrl = profilePath
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/${profilePath}?v=${imgCacheBuster}`
    : null;

  const avatarContent = (size: number, textClass: string) =>
    profileImageUrl && !imgError ? (
      <img
        src={profileImageUrl}
        alt=""
        className="rounded-full object-cover w-full h-full"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    ) : (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold select-none ${textClass}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        {initial}
      </span>
    );

  const userAvatar = (
    <span className="inline-flex shrink-0 overflow-hidden rounded-full" style={{ width: 36, height: 36 }} aria-hidden>
      {avatarContent(36, 'text-sm')}
    </span>
  );

  const userAvatarLarge = (
    <span className="inline-flex shrink-0 overflow-hidden rounded-full" style={{ width: 48, height: 48 }} aria-hidden>
      {avatarContent(48, 'text-base')}
    </span>
  );

  return (
    <Popover onOpenChange={(open) => open && fetchUserDetails()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 rounded-full p-0 ring-2 ring-primary/30 hover:ring-primary/60 hover:bg-accent transition-all focus-visible:ring-primary"
          style={{ width: 36, height: 36, minWidth: 36, minHeight: 36 }}
          aria-label={t('userMenu.profile')}
        >
          {userAvatar}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end" forceMount>
        <div className="flex items-center space-x-2">
          {userAvatarLarge}
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium leading-none">{userDetails.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userDetails.email}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{userDetails.points} pts</span>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {isAdmin && (
            <Link href="/admin" className="flex items-center text-sm text-primary font-medium">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t('nav.admin')}
            </Link>
          )}
          <Link href="/perfil" className="flex items-center text-sm">
            <User className="mr-2 h-4 w-4" />
            {t('userMenu.profile')}
          </Link>
          <Link href="/ajustes" className="flex items-center text-sm">
            <Settings className="mr-2 h-4 w-4" />
            {t('userMenu.settings')}
          </Link>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('userMenu.logout')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
