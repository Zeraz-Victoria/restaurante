import { createClient } from "@supabase/supabase-js";

// Estos valores deben venir del archivo .env.local
// NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-url.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

// Creamos un único cliente para usar en toda la App (Singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
