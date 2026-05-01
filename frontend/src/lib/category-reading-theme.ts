import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Cpu,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Laugh,
  Leaf,
  Plane,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { resolveCategoryId } from "@/lib/category-collection-image";

/** Solo el pictograma por categoría; color y fondo van unificados en la UI. */
export type ReadingCollectionTheme = {
  Icon: LucideIcon;
};

const FALLBACK: ReadingCollectionTheme = {
  Icon: BookOpen,
};

const BY_RESOLVED_ID: Record<number, ReadingCollectionTheme> = {
  1: { Icon: Users },
  2: { Icon: Briefcase },
  3: { Icon: GraduationCap },
  4: { Icon: UtensilsCrossed },
  5: { Icon: Plane },
  6: { Icon: HeartPulse },
  7: { Icon: Gamepad2 },
  8: { Icon: Leaf },
  9: { Icon: Cpu },
  10: { Icon: BookMarked },
  11: { Icon: Laugh },
};

export function getReadingCollectionTheme(
  categoryId: string | null,
  categoryName: string
): ReadingCollectionTheme {
  const resolved = resolveCategoryId(categoryId, categoryName);
  if (resolved != null && BY_RESOLVED_ID[resolved]) {
    return BY_RESOLVED_ID[resolved];
  }
  return FALLBACK;
}
