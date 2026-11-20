const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Appends one JSON line. Never throws: a logging failure must not fail the request.
async function audit(event, data = {}) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true }); // creates logs/ on first run
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n';
    await fs.appendFile(LOG_FILE, line, 'utf8');
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { audit, LOG_FILE };
