const PRIMEROS_PASOS_GIF =
  'https://www.gifsanimados.org/data/media/1353/medalla-imagen-animada-0020.gif';

const BADGE_CELEBRATION_URL: Record<string, string> = {
  streak_3: PRIMEROS_PASOS_GIF,
  streak_7:
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdmsxaDFzNWg2cGN6eTU2amRrb2o1ZWF0bGs2b2x2bmQyc2o3ZjF2diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4tJTOagKdHix67E73o/giphy.gif',
  streak_14:
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmt6YWVoY2pnMGd2NGZpeTl0dng2d2E3bWpxc3pxZXFlOXRoanB0ZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RQmaad8yzfKUhzR1Ls/giphy.gif',
  streak_30:
    'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExejFmdWhvamg4MzkyaTg0d3QzaGcweThqNW55bGRwcG5pa2lmN2wyOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aQhESBW5UxGxCXmY3A/giphy.gif',
  streak_60:
    'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTlxdTg3ZjE0cGJyODNveGF2dWttdzZlYTE1YmV4a2RodGpoNXkxaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1rQpwpGqyFIFW4ibnX/giphy.gif',
  streak_100:
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXVoenljZWE1M3hlMzB3MXJscTlxbWc1eWV2ZDc3YWl1cW1mNGI2aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VIVP6lYAQ6RuSMfzEm/giphy.gif',
};

export function badgeCelebrationGifUrl(badgeKey: string): string {
  return BADGE_CELEBRATION_URL[badgeKey] ?? PRIMEROS_PASOS_GIF;
}
