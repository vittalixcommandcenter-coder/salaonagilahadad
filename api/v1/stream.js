

module.exports = async (req, res) => {
    const { fileId } = req.query;
    if (!fileId) return res.status(400).json({ error: 'fileId is required' });

    console.log("Tentando buscar o arquivo no Telegram:", fileId);

    // 3. Resolve Telegram Path
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram Resolve Failed details:', JSON.stringify({
                fileId,
                status: data.error_code,
                desc: data.description,
            }));
            throw new Error(`Telegram Resolve Failed: ${data.description}`);
        }

        const filePath = data.result.file_path;
        console.log(`Stream Proxy: Successfully resolved ${fileId} -> ${filePath}`);
        const cdnUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

        // 4. Zero-Bandwidth Redirect
        res.setHeader('Referrer-Policy', 'same-origin');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.redirect(302, cdnUrl);

    } catch (err) {
        console.error('Vittalix HD Bridge Error:', err);
        return res.status(500).json({ error: 'CDN Bridge Error' });
    }
};
