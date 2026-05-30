const crypto = require('crypto');

function normalizeMessage(message) {
  return (message || '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/0x[0-9a-f]+/gi, '<hex>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/:\d+:\d+\)?/g, '') // strip line:col from stack frames
    .trim();
}

function extractTopFrames(stackTrace, n = 5) {
  if (!stackTrace) return '';
  return stackTrace
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('at '))
    .map(l => l.replace(/\s+\(.*\)$/, '')) // strip file path, keep function name
    .slice(0, n)
    .join('\n');
}

function computeFingerprint(message, stackTrace) {
  const input = `${normalizeMessage(message)}\n${extractTopFrames(stackTrace)}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

module.exports = { computeFingerprint };
