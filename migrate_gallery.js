const https = require('https');

const sql = `
  ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS telegram_file_ids TEXT[];
  ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS telegram_message_ids TEXT[];
  ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;
  ALTER TABLE public.gallery ALTER COLUMN telegram_file_id DROP NOT NULL;
`;

const data = JSON.stringify({ query: sql });

const options = {
  hostname: 'fjuiiivmsfdwsrqiobdu.supabase.co',
  path: '/rest/v1/',
  method: 'POST',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdWlpaXZtc2Zkd3NycWlvYmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODIyNjAsImV4cCI6MjA5MTI1ODI2MH0.-FyHmwxUJsloYRD6Wl6fjYrOHGf5CiFcaVgTT89bGMo',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdWlpaXZtc2Zkd3NycWlvYmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODIyNjAsImV4cCI6MjA5MTI1ODI2MH0.-FyHmwxUJsloYRD6Wl6fjYrOHGf5CiFcaVgTT89bGMo',
    'Content-Type': 'application/json',
    'Prefer': 'params=single-p',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => { process.stdout.write(d); });
});

req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
