import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htrhsswkrvzvhgbentru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cmhzc3drcnZ6dmhnYmVudHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDQ0MDIsImV4cCI6MjA5NDUyMDQwMn0.xZjGK_BSpMNKknVD7it0pkW96lzORXBYBj1PaBZlklk';

export const supabase = createClient(supabaseUrl, supabaseKey);
