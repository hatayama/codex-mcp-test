const net = require('net');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8700);
const timeoutMs = Number(process.env.TIMEOUT_MS || 1200);
const attempts = Number(process.env.ATTEMPTS || 3);

function tryOnce() {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const timer = setTimeout(() => {
      s.destroy();
      resolve({ ok: false, err: 'TIMEOUT' });
    }, timeoutMs);

    s.connect(port, host, () => {
      clearTimeout(timer);
      s.destroy();
      resolve({ ok: true });
    });

    s.on('error', (e) => {
      clearTimeout(timer);
      resolve({ ok: false, err: e && (e.code || e.message) });
    });
  });
}

(async () => {
  for (let i = 1; i <= attempts; i++) {
    const r = await tryOnce();
    if (r.ok) {
      console.log('SUCCESS');
      process.exit(0);
    }
    if (i === attempts) {
      console.log(`FAILED: ${r.err || 'UNKNOWN'}`);
      process.exit(1);
    }
  }
})();


