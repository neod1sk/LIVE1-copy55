
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ⚠️ 以下の値をあなたのSupabaseプロジェクトの値に書き換えてください
const SUPABASE_URL = 'https://cznwtorlerzmstnohzpq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bnd0b3JsZXJ6bXN0bm9oenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NDE2NTQsImV4cCI6MjA3OTIxNzY1NH0.Uc8GakAYzlqZCV-LstJl_Xx7Kj3j_CXj7Z3GHsvqvlc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);