import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Cpu,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Leaf,
  Plane,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { resolveCategoryId } from "@/lib/category-collection-image";

export type ReadingCollectionTheme = {
  Icon: LucideIcon;
  iconBg: string;
  iconFg: string;
  borderL: string;
};

const FALLBACK: ReadingCollectionTheme = {
  Icon: BookOpen,
  iconBg: "bg-slate-100 dark:bg-slate-800",
  iconFg: "text-slate-700 dark:text-slate-200",
  borderL: "border-l-slate-400/80",
};

const BY_RESOLVED_ID: Record<number, ReadingCollectionTheme> = {
  1: {
    Icon: Users,
    iconBg: "bg-rose-100 dark:bg-rose-950/50",
    iconFg: "text-rose-600 dark:text-rose-400",
    borderL: "border-l-rose-500/90",
  },
  2: {
    Icon: Briefcase,
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconFg: "text-amber-700 dark:text-amber-400",
    borderL: "border-l-amber-500/90",
  },
  3: {
    Icon: GraduationCap,
    iconBg: "bg-indigo-100 dark:bg-indigo-950/40",
    iconFg: "text-indigo-600 dark:text-indigo-400",
    borderL: "border-l-indigo-500/90",
  },
  4: {
    Icon: UtensilsCrossed,
    iconBg: "bg-orange-100 dark:bg-orange-950/40",
    iconFg: "text-orange-600 dark:text-orange-400",
    borderL: "border-l-orange-500/90",
  },
  5: {
    Icon: Plane,
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconFg: "text-sky-600 dark:text-sky-400",
    borderL: "border-l-sky-500/90",
  },
  6: {
    Icon: HeartPulse,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    borderL: "border-l-emerald-500/90",
  },
  7: {
    Icon: Gamepad2,
    iconBg: "bg-violet-100 dark:bg-violet-950/40",
    iconFg: "text-violet-600 dark:text-violet-400",
    borderL: "border-l-violet-500/90",
  },
  8: {
    Icon: Leaf,
    iconBg: "bg-green-100 dark:bg-green-950/40",
    iconFg: "text-green-700 dark:text-green-400",
    borderL: "border-l-green-600/90",
  },
  9: {
    Icon: Cpu,
    iconBg: "bg-cyan-100 dark:bg-cyan-950/40",
    iconFg: "text-cyan-700 dark:text-cyan-400",
    borderL: "border-l-cyan-600/90",
  },
  10: {
    Icon: BookMarked,
    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-950/40",
    iconFg: "text-fuchsia-700 dark:text-fuchsia-400",
    borderL: "border-l-fuchsia-600/90",
  },
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
