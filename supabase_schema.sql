-- 1. Tabela de Lições (Academy Cursos)
-- Suporta o sistema Vittalix-HD com múltiplos IDs de fragmentos do Telegram
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL, -- Ex: 'loiro', 'corte'
    title TEXT NOT NULL,
    description TEXT,
    telegram_file_ids TEXT[] NOT NULL, -- Array ordenado de IDs de fragmentos (49MB cada)
    thumbnail_url TEXT,
    is_free BOOLEAN DEFAULT false,
    "order" INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Galeria de Arte (Portfolio)
-- Armazena o acervo do salão em alta fidelidade
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    tag TEXT DEFAULT 'PORTFOLIO',
    telegram_file_id TEXT, -- Fallback / Parte 1
    telegram_file_ids TEXT[], -- Array de todos os fragmentos (Vittalix-HD)
    telegram_message_id TEXT, -- IDs para deleção
    telegram_message_ids TEXT[],
    media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO')),
    is_featured BOOLEAN DEFAULT false,
    "order" INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Configurações de Segurança (Row Level Security)
-- Protege o conteúdo premium da pirataria e acessos externos

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Apenas alunos autenticados podem ver as lições
CREATE POLICY "Acesso apenas para alunos autenticados" 
ON public.lessons FOR SELECT 
USING (auth.role() = 'authenticated');

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Galeria é pública para visualização, mas controlada por metadados
CREATE POLICY "Galeria aberta para visualização pública" 
ON public.gallery FOR SELECT 
USING (true);

-- 4. Função de Ordenação (Helper para o Frontend)
COMMENT ON TABLE public.lessons IS 'Tabela central para o LMS da Nagila Academy com suporte a CDN Telegram.';

-- 5. Tabela de Cursos (CMS Principal — alimenta Academy e Landing Pages)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT DEFAULT 'CURSO',
    description TEXT,
    status_badge TEXT,      -- Badge manual da vitrine (ex: NOVO, DESTAQUE)
    syllabus TEXT,
    price NUMERIC(10,2),
    cover_url TEXT,         -- URL da capa via proxy /api/v1/stream
    trailer_url TEXT,       -- URL do trailer via proxy /api/v1/stream
    telegram_file_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Cursos são públicos para leitura (vitrine)
CREATE POLICY "Cursos visíveis para todos"
ON public.courses FOR SELECT
USING (true);

-- Somente usuários autenticados (admin) podem gerenciar
CREATE POLICY "Admin pode gerenciar cursos"
ON public.courses FOR ALL
USING (auth.role() = 'authenticated');

-- Somente usuários autenticados (admin) podem gerenciar
CREATE POLICY "Admin pode gerenciar galeria"
ON public.gallery FOR ALL
USING (auth.role() = 'authenticated');

-- Adicionar coluna de destaque de vitrine para a Landing Page
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

COMMENT ON TABLE public.gallery IS 'Galeria de transformações e curadoria de vídeos da academia.';

COMMENT ON TABLE public.courses IS 'CMS de cursos — alimenta dinamicamente a Academy e Landing Pages.';

-- 6. Tabela de Compras (Acesso de Alunos aos Cursos)
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    course_id UUID REFERENCES public.courses(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- Alunos veem seus próprios cursos
CREATE POLICY "Alunos veem seus proprios cursos" 
ON public.user_courses FOR SELECT 
USING (auth.uid() = user_id);

-- Para permitir que o checkout insira a compra
CREATE POLICY "Permitir insercao de compra" 
ON public.user_courses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_courses IS 'Tabela de relacionamento entre alunos (auth.users) e cursos adquiridos.';
