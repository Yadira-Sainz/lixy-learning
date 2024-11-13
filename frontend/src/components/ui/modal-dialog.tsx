'use client'

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy } from 'lucide-react'

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, currentStreak, longestStreak }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            ¡Felicidades!
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Has completado tu revisión de 20 palabras.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
            <span className="text-2xl font-bold text-primary">{currentStreak}</span>
            <span className="text-sm text-muted-foreground">Racha actual</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
            <span className="text-2xl font-bold text-primary">{longestStreak}</span>
            <span className="text-sm text-muted-foreground">Mejor racha</span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Ir al tablero
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;