-- Add fields to track reservation relationships for early checkout transfers
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS original_reservation_id UUID REFERENCES public.reservations(id);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS transfer_type TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS transferred_from TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS transferred_to TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_reservations_original_reservation_id ON public.reservations(original_reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_transfer_type ON public.reservations(transfer_type);