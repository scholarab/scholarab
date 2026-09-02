import { z } from 'zod'

export const httpsUrl = z.url().max(2048).refine(
  u => u.startsWith('https://'),
  'URL must use HTTPS',
)
