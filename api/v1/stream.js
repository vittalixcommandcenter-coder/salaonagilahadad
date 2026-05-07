

module.exports = async (req, res) => {
    const { fileId } = req.query;
    if (!fileId) return res.status(400).json({ error: 'fileId is required' });

    console.log("Tentando buscar o arquivo no Telegram:", fileId);

    const botToken = "8337088620:AAEv6otSp100rdmZ0TIHVFy4tEMGjrXzqp4";
    console.log(`[VITTALIX-BRIDGE] Solicitando Media ID: ${fileId}`);
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`, {
            signal: AbortSignal.timeout(15000) // Aumentando para 15s
        });
        const data = await response.json();

        if (!data.ok) {
            console.error('[VITTALIX-BRIDGE] Telegram Error:', data.description);
            return res.status(404).json({ error: 'Video not found in Telegram' });
        }

        const filePath = data.result.file_path;
        const cdnUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.redirect(302, cdnUrl);

    } catch (err) {
        console.error('Vittalix HD Bridge Error:', err);
        return res.status(500).json({ error: 'CDN Bridge Error' });
    }
};
