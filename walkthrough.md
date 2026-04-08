# Walkthrough da Implementação Vittalix-HD

O ecossistema de entrega de mídia segura da **Nagila Academy** foi implementado com sucesso. Abaixo está a listagem física dos arquivos e como ativá-los.

## 1. Localização Física dos Arquivos (Diretório do Projeto)

Verifique se estes arquivos estão na sua pasta local para o `push`:

- **[supabase_schema.sql](file:///d:/Projetos/Salao%20Nagila%20Hadad/supabase_schema.sql)**: Esquema do banco de dados (Rode isso no Editor SQL do Supabase).
- **[api/v1/stream.js](file:///d:/Projetos/Salao%20Nagila%20Hadad/api/v1/stream.js)**: Proxy de Redirecionamento 302 (Vercel Backend).
- **[admin-upload.js](file:///d:/Projetos/Salao%20Nagila%20Hadad/admin-upload.js)**: Motor de Fatiamento (Chunking) e Upload do Admin.
- **[vittalix-player.js](file:///d:/Projetos/Salao%20Nagila%20Hadad/vittalix-player.js)**: Motor de Streaming Seguro (MSE) e Camuflagem Blob.

---

## 2. Instruções de Ativação

> [!IMPORTANT]
> **Metadados do Supabase**:
> Nos arquivos `ateliere-admin.html` e `dashboard.html`, procure pelos placeholders `SUPABASE_URL_HERE` e `SUPABASE_ANON_KEY_HERE` e substitua-os pelas chaves do seu projeto para ativar a sincronização em tempo real.

---

## 3. Fluxo de Funcionamento

1. **Admin**: Seleciona um vídeo > O `admin-upload.js` fatia em partes de 49MB > Envia ao Telegram > Salva os IDs no Supabase.
2. **Aluno**: Abre a lição > O `vittalix-player.js` lê os IDs > Solicita o stream seguro > O `api/v1/stream.js` autoriza e redireciona para o Telegram.
3. **Resultado**: **Velocidade máxima**, **Custo Zero** e o vídeo fica **camuflado** no console do navegador (BLOB).

---

> [!TIP]
> **Segurança Adicional**: Recomendo que, após o push para a Vercel, você configure o `Referrer-Policy` também nas configurações globais de segurança da plataforma para garantir que as URLs do Telegram nunca sejam acessadas fora do seu domínio.
