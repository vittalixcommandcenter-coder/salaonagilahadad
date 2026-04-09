/**
 * /api/v1/delete-proxy.js
 * Proxy para apagar a mídia remotamente do CDN (Telegram).
 */

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, description: 'Method not allowed' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID   = process.env.TELEGRAM_CHANNEL_ID || '-1003946361387';

    if (!BOT_TOKEN) {
        return res.status(500).json({ ok: false, description: 'TELEGRAM_BOT_TOKEN não configurado.' });
    }

    const { message_id } = req.body;
    if (!message_id) {
        return res.status(400).json({ ok: false, description: 'message_id obrigatório.' });
    }

    try {
        const telegramRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, message_id: parseInt(message_id, 10) })
            }
        );

        const data = await telegramRes.json();
        return res.status(telegramRes.status).json(data);
    } catch (err) {
        console.error("Delete Proxy Error:", err);
        return res.status(500).json({ ok: false, description: err.message });
    }
}
