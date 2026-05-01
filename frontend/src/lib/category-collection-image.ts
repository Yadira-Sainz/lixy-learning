/**
 * Imágenes representativas por colección (categoría de vocabulario).
 * IDs alineados con el orden típico en db_ddl.sql (incl. Memes); el nombre sirve como respaldo.
 */

const FALLBACK =
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80";

/** Marcador: la tarjeta Memes renderiza SVG inline (standalone a veces no sirve /public). */
export const CATEGORY_CARD_INLINE_MEMES = "__inline_memes_cover__";

const BY_ID: Record<number, string> = {
  1: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80",
  2: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  3: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
  4: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
  5: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
  6: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  7: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
  8: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80",
  9: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
  10: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
  11: CATEGORY_CARD_INLINE_MEMES,
};

const BY_NAME_KEY: Record<string, string> = {
  family: BY_ID[1]!,
  "work/business": BY_ID[2]!,
  work: BY_ID[2]!,
  business: BY_ID[2]!,
  education: BY_ID[3]!,
  food: BY_ID[4]!,
  "travel/places": BY_ID[5]!,
  travel: BY_ID[5]!,
  places: BY_ID[5]!,
  health: BY_ID[6]!,
  "hobbies/leisure": BY_ID[7]!,
  hobbies: BY_ID[7]!,
  leisure: BY_ID[7]!,
  "nature/environment": BY_ID[8]!,
  nature: BY_ID[8]!,
  environment: BY_ID[8]!,
  technology: BY_ID[9]!,
  "grammar/function word": BY_ID[10]!,
  grammar: BY_ID[10]!,
  memes: BY_ID[11]!,
};

/** Nombre normalizado → id canónico (mismas claves que BY_NAME_KEY). */
const NAME_TO_ID: Record<string, number> = {
  family: 1,
  "work/business": 2,
  work: 2,
  business: 2,
  education: 3,
  food: 4,
  "travel/places": 5,
  travel: 5,
  places: 5,
  health: 6,
  "hobbies/leisure": 7,
  hobbies: 7,
  leisure: 7,
  "nature/environment": 8,
  nature: 8,
  environment: 8,
  technology: 9,
  "grammar/function word": 10,
  grammar: 10,
  memes: 11,
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Resuelve el id de categoría conocido (1–11) a partir del id numérico o del nombre.
 * Útil para temas/iconos alineados con las colecciones del seed SQL.
 */
export function resolveCategoryId(
  categoryId: string | number | null | undefined,
  categoryName: string
): number | null {
  if (categoryId != null && categoryId !== "") {
    const n =
      typeof categoryId === "string" ? parseInt(categoryId, 10) : categoryId;
    if (Number.isFinite(n) && BY_ID[n as number]) return n as number;
  }
  const key = normalizeName(categoryName);
  const direct = NAME_TO_ID[key];
  if (direct != null) return direct;
  for (const [needle, id] of Object.entries(NAME_TO_ID)) {
    if (key.includes(needle) || needle.includes(key)) return id;
  }
  return null;
}

export function getCategoryCollectionImageSrc(
  categoryId: number,
  categoryName: string
): string {
  const byId = BY_ID[categoryId];
  if (byId) return byId;

  const key = normalizeName(categoryName);
  const byName = BY_NAME_KEY[key];
  if (byName) return byName;

  for (const [needle, src] of Object.entries(BY_NAME_KEY)) {
    if (key.includes(needle) || needle.includes(key)) return src;
  }

  return FALLBACK;
}
