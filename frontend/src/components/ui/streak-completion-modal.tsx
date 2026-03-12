'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Star, Award, Zap } from 'lucide-react';
import { useLocale } from '@/contexts/locale-context';

type Badge = {
  badge_id: number;
  badge_key: string;
  name_es: string;
  description_es: string;
  required_streak: number;
  icon_name: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
  completedCount: number;
  newBadges?: Badge[];
};

const BADGE_ICONS: Record<string, React.ElementType> = {
  flame: Flame,
  star: Star,
  medal: Award,
  trophy: Trophy,
  crown: Trophy,
  gem: Zap,
};

export default function StreakCompletionModal({ isOpen, onClose, currentStreak, longestStreak, completedCount, newBadges = [] }: Props) {
  const { t } = useLocale();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            {t('modal.congrats')}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {t('modal.completedReviewPrefix')} {completedCount} {t('modal.completedReviewSuffix')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
            <span className="text-2xl font-bold text-primary">{currentStreak}</span>
            <span className="text-sm text-muted-foreground">{t('modal.currentStreak')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-primary/10 rounded-lg">
            <span className="text-2xl font-bold text-primary">{longestStreak}</span>
            <span className="text-sm text-muted-foreground">{t('modal.bestStreak')}</span>
          </div>
        </div>
        {newBadges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">{t('modal.newBadgesUnlocked')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {newBadges.map((b) => {
                const Icon = BADGE_ICONS[b.icon_name] || Trophy;
                return (
                  <div
                    key={b.badge_id}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200"
                    title={b.description_es}
                  >
                    <Icon className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium">{b.name_es}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            {t('modal.goToDashboard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
