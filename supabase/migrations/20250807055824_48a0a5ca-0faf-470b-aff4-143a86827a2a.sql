-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'paid',
  'partial',
  'overdue',
  'cancelled',
  'refunded'
);

-- Create payment type enum
CREATE TYPE public.payment_type AS ENUM (
  'reservation_deposit',
  'reservation_balance',
  'full_payment',
  'cleaning_fee',
  'damage_deposit',
  'pet_fee',
  'late_fee',
  'refund',
  'other'
);

-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'check',
  'venmo',
  'paypal',
  'bank_transfer',
  'stripe',
  'other'
);

-- Create comprehensive payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  reservation_id UUID,
  family_group TEXT NOT NULL,
  
  -- Payment details
  payment_type payment_type NOT NULL DEFAULT 'full_payment',
  amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  
  -- Dates
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Payment method and reference
  payment_method payment_method,
  payment_reference TEXT, -- Check number, Venmo transaction ID, etc.
  
  -- Administrative
  description TEXT,
  notes TEXT,
  created_by_user_id UUID,
  updated_by_user_id UUID,
  
  -- Calculated field for remaining balance
  balance_due DECIMAL(10,2) GENERATED ALWAYS AS (amount - COALESCE(amount_paid, 0)) STORED
);

-- Add foreign key reference to reservations (optional since some payments might not be reservation-related)
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_reservation 
FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX idx_payments_reservation_id ON public.payments(reservation_id);
CREATE INDEX idx_payments_family_group ON public.payments(family_group);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their organization's payments" 
ON public.payments 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create payments for their organization" 
ON public.payments 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's payments" 
ON public.payments 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's payments" 
ON public.payments 
FOR DELETE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Supervisors can manage all payments" 
ON public.payments 
FOR ALL 
USING (is_supervisor());

-- Create function to automatically update payment status based on amount paid
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on amount paid vs amount due
  IF NEW.amount_paid >= NEW.amount THEN
    NEW.status = 'paid';
    NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.amount_paid = 0 THEN
    NEW.status = 'overdue';
  END IF;
  
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update payment status
CREATE TRIGGER trigger_update_payment_status
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

-- Create function to generate payments from reservations
CREATE OR REPLACE FUNCTION public.create_reservation_payment(
  p_reservation_id UUID,
  p_split_deposit BOOLEAN DEFAULT false,
  p_deposit_percentage DECIMAL(5,2) DEFAULT 50.00
)
RETURNS UUID AS $$
DECLARE
  reservation_data RECORD;
  payment_id UUID;
  deposit_amount DECIMAL(10,2);
  balance_amount DECIMAL(10,2);
BEGIN
  -- Get reservation details
  SELECT r.*, rs.* INTO reservation_data
  FROM reservations r
  JOIN reservation_settings rs ON r.organization_id = rs.organization_id
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  
  -- Calculate payment amounts
  IF p_split_deposit THEN
    deposit_amount := (reservation_data.total_cost * p_deposit_percentage / 100);
    balance_amount := reservation_data.total_cost - deposit_amount;
    
    -- Create deposit payment
    INSERT INTO public.payments (
      organization_id,
      reservation_id,
      family_group,
      payment_type,
      amount,
      description,
      due_date
    ) VALUES (
      reservation_data.organization_id,
      p_reservation_id,
      reservation_data.family_group,
      'reservation_deposit',
      deposit_amount,
      'Reservation deposit for ' || reservation_data.property_name,
      reservation_data.start_date - INTERVAL '30 days'
    );
    
    -- Create balance payment
    INSERT INTO public.payments (
      organization_id,
      reservation_id,
      family_group,
      payment_type,
      amount,
      description,
      due_date
    ) VALUES (
      reservation_data.organization_id,
      p_reservation_id,
      reservation_data.family_group,
      'reservation_balance',
      balance_amount,
      'Reservation balance for ' || reservation_data.property_name,
      reservation_data.start_date - INTERVAL '7 days'
    ) RETURNING id INTO payment_id;
  ELSE
    -- Create single full payment
    INSERT INTO public.payments (
      organization_id,
      reservation_id,
      family_group,
      payment_type,
      amount,
      description,
      due_date
    ) VALUES (
      reservation_data.organization_id,
      p_reservation_id,
      reservation_data.family_group,
      'full_payment',
      reservation_data.total_cost,
      'Full payment for ' || reservation_data.property_name,
      reservation_data.start_date - INTERVAL '14 days'
    ) RETURNING id INTO payment_id;
  END IF;
  
  RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;