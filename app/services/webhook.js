async function sendAlert(webhookUrl, payload, maxRetries = 3) {
  const body = JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
    source: 'GlitchRadar',
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'GlitchRadar/1.0' },
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return;
      // Non-2xx: retry on server errors, give up on client errors
      if (res.status < 500) return;
    } catch {
      // Network error or timeout — retry
    }

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

module.exports = { sendAlert };
