-- Create shopping lists table
CREATE TABLE public.shopping_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Shopping List',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shopping list items table
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  added_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seasonal documents table
CREATE TABLE public.seasonal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  season TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_url TEXT,
  document_type TEXT NOT NULL DEFAULT 'guide',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shopping_lists
CREATE POLICY "Users can view their organization's shopping lists" 
ON public.shopping_lists 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create shopping lists for their organization" 
ON public.shopping_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's shopping lists" 
ON public.shopping_lists 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's shopping lists" 
ON public.shopping_lists 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Create RLS policies for shopping_list_items
CREATE POLICY "Users can view their organization's shopping list items" 
ON public.shopping_list_items 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create items for their organization" 
ON public.shopping_list_items 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's shopping list items" 
ON public.shopping_list_items 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's shopping list items" 
ON public.shopping_list_items 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Create RLS policies for documents
CREATE POLICY "Users can view their organization's documents" 
ON public.documents 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create documents for their organization" 
ON public.documents 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's documents" 
ON public.documents 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's documents" 
ON public.documents 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Create RLS policies for seasonal_documents
CREATE POLICY "Users can view their organization's seasonal documents" 
ON public.seasonal_documents 
FOR SELECT 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create seasonal documents for their organization" 
ON public.seasonal_documents 
FOR INSERT 
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's seasonal documents" 
ON public.seasonal_documents 
FOR UPDATE 
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's seasonal documents" 
ON public.seasonal_documents 
FOR DELETE 
USING (organization_id = get_user_organization_id());

-- Add supervisor policies for all tables
CREATE POLICY "Supervisors can manage all shopping lists" 
ON public.shopping_lists 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all shopping list items" 
ON public.shopping_list_items 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all documents" 
ON public.documents 
FOR ALL 
USING (is_supervisor());

CREATE POLICY "Supervisors can manage all seasonal documents" 
ON public.seasonal_documents 
FOR ALL 
USING (is_supervisor());

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Create storage policies for documents bucket
CREATE POLICY "Users can view their organization's documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Create triggers for updating updated_at timestamps
CREATE TRIGGER update_shopping_lists_updated_at
BEFORE UPDATE ON public.shopping_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at
BEFORE UPDATE ON public.shopping_list_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seasonal_documents_updated_at
BEFORE UPDATE ON public.seasonal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();