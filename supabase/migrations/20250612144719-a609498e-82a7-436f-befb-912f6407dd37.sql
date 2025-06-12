
-- Add missing columns to bingo_rooms table to match the working model
ALTER TABLE public.bingo_rooms 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
ADD COLUMN IF NOT EXISTS board_size INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS call_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS current_call JSONB,
ADD COLUMN IF NOT EXISTS host_id UUID,
ADD COLUMN IF NOT EXISTS current_turn UUID;

-- Update the game_status column to use 'status' to match the working model
ALTER TABLE public.bingo_rooms 
RENAME COLUMN game_status TO status;

-- Update room_code to code to match working model
ALTER TABLE public.bingo_rooms 
RENAME COLUMN room_code TO code;

-- Add missing columns to bingo_players table
ALTER TABLE public.bingo_players 
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT false;

-- Enable realtime for both tables
ALTER TABLE public.bingo_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.bingo_players REPLICA IDENTITY FULL;

-- Update default values to match working model
ALTER TABLE public.bingo_rooms 
ALTER COLUMN status SET DEFAULT 'waiting';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bingo_rooms_code ON public.bingo_rooms(code);
CREATE INDEX IF NOT EXISTS idx_bingo_players_room_id ON public.bingo_players(room_id);
CREATE INDEX IF NOT EXISTS idx_bingo_players_joined_at ON public.bingo_players(joined_at);
