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
    telegram_file_id TEXT NOT NULL, -- ID único do Telegram (Custo Zero de Banda)
    media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO')),
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
