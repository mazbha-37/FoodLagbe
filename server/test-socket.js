/**
 * Food Lagbe — Socket.IO Test Script
 * ------------------------------------
 * Usage:
 *   node test-socket.js                        # auto-login with test customer
 *   node test-socket.js --token <access_token> # use an existing JWT
 *   node test-socket.js --role rider           # login as a rider instead
 *
 * The script connects, listens to all events for 15 seconds, then exits.
 */

require('dotenv').config();

const { io: connectSocket } = require('socket.io-client');
const http = require('http');

// ─── Credentials ──────────────────────────────────────────────────────────────

const TEST_ACCOUNTS = {
  customer: { email: 'anika@example.com', password: 'Customer@1234' },
  rider:    { email: 'sumon@riders.com',  password: 'Rider@1234'    },
  owner:    { email: 'rahim@kacchibhai.com', password: 'Owner@1234' },
};

const SERVER_URL = `http://localhost:${process.env.PORT || 5000}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = { token: null, role: 'customer' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--token' && args[i + 1]) result.token = args[++i];
    if (args[i] === '--role' && args[i + 1])  result.role  = args[++i];
  }
  return result;
};

const login = (email, password) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({ email, password });
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.accessToken) resolve(parsed.accessToken);
          else reject(new Error(parsed.message || 'Login failed'));
        } catch {
          reject(new Error('Invalid response from login endpoint'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });

// ─── All Socket.IO events to listen for ──────────────────────────────────────

const EVENTS = [
  'notification',
  'new_order',
  'order_status_update',
  'order_cancelled',
  'rider_assigned',
  'delivery_assigned',
  'rider_location_update',
  'new_message',
  'connect_error',
];

// ─── Main ──────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

const run = async () => {
  const { token: cliToken, role } = parseArgs();

  let token = cliToken;

  if (!token) {
    const creds = TEST_ACCOUNTS[role] || TEST_ACCOUNTS.customer;
    console.log(`\n🔐 Logging in as ${creds.email} …`);
    try {
      token = await login(creds.email, creds.password);
      console.log('✓ Login successful\n');
    } catch (err) {
      console.error(`✗ Login failed: ${err.message}`);
      console.error('  Is the server running?  npm run dev');
      process.exit(1);
    }
  } else {
    console.log('\n🔐 Using provided token\n');
  }

  console.log(`🔌 Connecting to ${SERVER_URL} …`);
  const socket = connectSocket(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log(`✓ Connected  [socket id: ${socket.id}]`);
    console.log(`⏳ Listening for ${TIMEOUT_MS / 1000}s — trigger an order action to see events…\n`);
  });

  socket.on('connect_error', (err) => {
    console.error(`✗ Connection error: ${err.message}`);
    process.exit(1);
  });

  // Listen to all tracked events
  for (const event of EVENTS) {
    if (event === 'connect_error') continue; // already registered above
    socket.on(event, (data) => {
      const ts = new Date().toISOString().slice(11, 23);
      console.log(`[${ts}] 📨 ${event.padEnd(24)} →`, JSON.stringify(data, null, 2));
    });
  }

  socket.on('disconnect', (reason) => {
    console.log(`\n🔌 Disconnected: ${reason}`);
  });

  // ── Optional: demonstrate rider_location_update if logged in as rider ────────
  if (role === 'rider') {
    console.log('🚴 Rider mode — will emit a test location update in 2 seconds…');
    setTimeout(() => {
      socket.emit('rider_location_update', {
        orderId: '000000000000000000000000', // replace with a real orderId
        latitude:  23.7461,
        longitude: 90.3742,
        heading: 90,
        speed: 15,
      });
      console.log('📍 Emitted rider_location_update (replace orderId for real test)');
    }, 2000);
  }

  // ── Auto-disconnect after timeout ─────────────────────────────────────────────
  setTimeout(() => {
    console.log(`\n⏱  ${TIMEOUT_MS / 1000}s elapsed — disconnecting.`);
    socket.disconnect();
    process.exit(0);
  }, TIMEOUT_MS);
};

run().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
