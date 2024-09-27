import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Settings, User, LogOut } from "lucide-react"

export default function UserMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" alt="@username" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end" forceMount>
        <div className="flex items-center space-x-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/placeholder.svg" alt="@username" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">Usuario Ejemplo</p>
            <p className="text-xs leading-none text-muted-foreground">
              usuario@ejemplo.com
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
          <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => console.log('Cerrar sesión')}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}