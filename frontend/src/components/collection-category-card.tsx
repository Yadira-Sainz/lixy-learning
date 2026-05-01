"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CATEGORY_CARD_INLINE_MEMES,
  getCategoryCollectionImageSrc,
} from "@/lib/category-collection-image";
import { MemesCategoryCoverArt } from "@/components/memes-category-cover-art";

type CollectionCategoryCardProps = {
  categoryId: number;
  categoryName: string;
  hint: string;
  onClick: () => void;
};

export function CollectionCategoryCard({
  categoryId,
  categoryName,
  hint,
  onClick,
}: CollectionCategoryCardProps) {
  const src = getCategoryCollectionImageSrc(categoryId, categoryName);

  return (
    <Card
      className="cursor-pointer overflow-hidden p-0 transition-shadow duration-300 hover:shadow-lg"
      onClick={onClick}
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {src === CATEGORY_CARD_INLINE_MEMES ? (
          <div className="absolute inset-0 overflow-hidden bg-[#fafafa]">
            <MemesCategoryCoverArt className="object-cover" />
          </div>
        ) : src.endsWith(".svg") ? (
          <img
            src={src}
            alt={categoryName}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Image
            src={src}
            alt={categoryName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
            unoptimized
          />
        )}
      </div>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-lg leading-tight line-clamp-2">
          {categoryName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
