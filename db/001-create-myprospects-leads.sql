CREATE TABLE IF NOT EXISTS public.myprospects_leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_type TEXT NOT NULL,
  source TEXT NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  website TEXT,
  use_case TEXT,
  monthly_traffic TEXT,
  message TEXT,
  notes TEXT,
  consent BOOLEAN,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT myprospects_leads_submission_type_check
    CHECK (submission_type IN ('contact', 'free_trial'))
);

CREATE INDEX IF NOT EXISTS myprospects_leads_created_at_idx
  ON public.myprospects_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS myprospects_leads_source_idx
  ON public.myprospects_leads (source, created_at DESC);
