-- RESET TOTAL DE SEGURANÇA NAGILA HADAD
DROP POLICY IF EXISTS "Galeria aberta para visualização pública" ON public.gallery;
DROP POLICY IF EXISTS "Admin pode gerenciar galeria" ON public.gallery;
DROP POLICY IF EXISTS "Galeria pública total" ON public.gallery;
CREATE POLICY "ACESSO_TOTAL_GALLERY" ON public.gallery FOR ALL USING (true) WITH CHECK (true);

-- FIX TABELA COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'CURSO',
    description TEXT,
    syllabus TEXT,
    price NUMERIC(10,2),
    cover_url TEXT,
    trailer_url TEXT,
    telegram_file_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP POLICY IF EXISTS "Cursos visíveis para todos" ON public.courses;
DROP POLICY IF EXISTS "Admin pode gerenciar cursos" ON public.courses;
CREATE POLICY "ACESSO_TOTAL_COURSES" ON public.courses FOR ALL USING (true) WITH CHECK (true);
