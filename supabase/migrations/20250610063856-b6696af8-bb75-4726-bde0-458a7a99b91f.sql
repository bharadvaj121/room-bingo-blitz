
-- Add the missing is_manual_mode column to bingo_rooms table
ALTER TABLE public.bingo_rooms 
ADD COLUMN is_manual_mode BOOLEAN DEFAULT false;
