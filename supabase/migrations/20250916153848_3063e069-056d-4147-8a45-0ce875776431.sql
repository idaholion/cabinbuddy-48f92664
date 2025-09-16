-- Add shares_abstain column to voting_proposals table
ALTER TABLE public.voting_proposals 
ADD COLUMN shares_abstain INTEGER DEFAULT 0 NOT NULL;