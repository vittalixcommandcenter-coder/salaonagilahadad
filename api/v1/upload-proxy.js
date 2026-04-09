/**
 * /api/v1/upload-proxy.js
 * Serverless proxy: recebe o arquivo do frontend e envia ao Telegram.
 * O BOT_TOKEN nunca é exposto ao cliente.
 */

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, description: 'Method not allowed' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID   = process.env.TELEGRAM_CHAT_ID || '-1003946361387';

    if (!BOT_TOKEN) {
        return res.status(500).json({ ok: false, description: 'TELEGRAM_BOT_TOKEN não configurado.' });
    }

    // Coletar o body raw para repassar ao Telegram
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    // Extrair o Content-Type do request original (multipart/form-data com boundary)
    const contentType = req.headers['content-type'];

    const type = req.query.type === 'photo' ? 'sendPhoto' : 'sendDocument';
    
    // Log seguro para Vercel
    const maskedChatId = CHAT_ID ? `${CHAT_ID.substring(0, 4)}...${CHAT_ID.slice(-4)}` : 'UNDEFINED';
    console.log(`[Upload Proxy] Enviando ${type} para chat_id: ${maskedChatId}`);

    const telegramRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/${type}?chat_id=${CHAT_ID}`,
        {
            method: 'POST',
            headers: { 'Content-Type': contentType },
            body: rawBody,
        }
    );

    const data = await telegramRes.json();
    if (!data.ok) {
        console.error('[Upload Proxy] Telegram Error:', JSON.stringify(data));
    }
    return res.status(telegramRes.status).json(data);
}
