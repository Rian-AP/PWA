import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Создаем клиент только если переменные окружения установлены
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Types для базы данных
export interface FavoriteAnime {
  id: string
  user_id: string
  anime_id: number
  anime_slug: string
  anime_name: string
  anime_image: string
  created_at: string
}
