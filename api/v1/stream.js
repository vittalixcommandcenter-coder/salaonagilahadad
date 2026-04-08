const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
    const { fileId } = req.query;
    if (!fileId) return res.status(400).json({ error: 'fileId is required' });

    // 1. Initialize Supabase
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Validate Session
    const authHeader = req.headers.authorization;
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.split(' ')[1]);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized: Premium high-end content requires a valid session.' });
    }

    // 3. Resolve Telegram Path
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const data = await response.json();

        if (!data.ok) throw new Error('Telegram Resolve Failed');

        const filePath = data.result.file_path;
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
