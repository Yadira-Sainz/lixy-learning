import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, User, LogOut } from "lucide-react";
import axios from "axios";
import { useRouter } from 'next/navigation';

const hostname = process.env.REACT_APP_HOSTNAME;

export default function UserMenu() {
  const [userDetails, setUserDetails] = React.useState({ username: '', email: '' });
  const router = useRouter(); // Use router for redirection

  React.useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://' + hostname + ':5001/user-details', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUserDetails(response.data);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/auth?tab=login'); // Redirect to login page
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" alt={`@${userDetails.username}`} />
            <AvatarFallback>{userDetails.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end" forceMount>
        <div className="flex items-center space-x-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/placeholder.svg" alt={`@${userDetails.username}`} />
            <AvatarFallback>{userDetails.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{userDetails.username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userDetails.email}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Link href="/perfil" className="flex items-center text-sm">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </Link>
          <Link href="/ajustes" className="flex items-center text-sm">
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </Link>
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
