const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const NodeMediaServer = require('node-media-server');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// PostgreSQL Connection Pool Setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase SSL connection
  }
});

// Node Media Server (RTMP & HTTP-FLV) Configuration
const nmsConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 4000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};

const nms = new NodeMediaServer(nmsConfig);

// Initialize Supabase PostgreSQL Database Tables
async function initDb() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to Supabase PostgreSQL Database.');
    client.release();
  } catch (err) {
    console.error('Database Connection Error. Please verify DATABASE_URL in .env file.');
    console.error(err.message);
  }

  // Create Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      nickname VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL
    )
  `);

  // Create Song Requests Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS song_requests (
      id SERIAL PRIMARY KEY,
      streamer_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      requester VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'waiting',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert mock admin account if not exists
  try {
    const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (username, nickname, password) VALUES ($1, $2, $3)',
        ['admin', '음악대장', 'admin123']
      );
      console.log('Mock admin account created in Cloud DB.');
    }
  } catch (err) {
    console.error('Failed to create mock admin account:', err.message);
  }
}

// ---------------- API ENDPOINTS ----------------

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  const { username, nickname, password } = req.body;
  if (!username || !nickname || !password) {
    return res.status(400).json({ error: '모든 필드를 입력해 주세요.' });
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: '이미 등록된 아이디입니다.' });
    }

    await pool.query(
      'INSERT INTO users (username, nickname, password) VALUES ($1, $2, $3)',
      [username, nickname, password]
    );
    res.status(201).json({ success: true, message: '회원가입 성공' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해 주세요.' });
  }

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호를 다시 확인해 주세요.' });
    }

    const user = userCheck.rows[0];
    res.json({
      success: true,
      user: {
        username: user.username,
        nickname: user.nickname
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// Get Song Request Queue for a Streamer
app.get('/api/streams/:id/requests', async (req, res) => {
  const streamerId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM song_requests WHERE streamer_id = $1 ORDER BY id ASC',
      [streamerId]
    );
    res.json({ queue: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '신청곡 대기열 조회 실패' });
  }
});

// Post a Song Request
app.post('/api/streams/:id/requests', async (req, res) => {
  const streamerId = req.params.id;
  const { title, requester } = req.body;

  if (!title || !requester) {
    return res.status(400).json({ error: '곡명과 신청자 정보가 필요합니다.' });
  }

  try {
    // Check if there is already a song marked 'playing'
    const activeSong = await pool.query(
      "SELECT id FROM song_requests WHERE streamer_id = $1 AND status = 'playing'",
      [streamerId]
    );

    const status = activeSong.rows.length > 0 ? 'waiting' : 'playing';

    await pool.query(
      'INSERT INTO song_requests (streamer_id, title, requester, status) VALUES ($1, $2, $3, $4)',
      [streamerId, title, requester, status]
    );

    res.status(201).json({ success: true, message: '신청곡 등록 성공' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '신청곡 등록 실패' });
  }
});

// Update Request Status (e.g. Set a song playing)
app.patch('/api/streams/:id/requests/:requestId', async (req, res) => {
  const streamerId = req.params.id;
  const requestId = parseInt(req.params.requestId);
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: '변경할 상태 정보가 필요합니다.' });
  }

  try {
    if (status === 'playing') {
      // 1. Reset all requests of this streamer to 'waiting'
      await pool.query(
        "UPDATE song_requests SET status = 'waiting' WHERE streamer_id = $1",
        [streamerId]
      );
      // 2. Set only selected request to 'playing'
      await pool.query(
        "UPDATE song_requests SET status = 'playing' WHERE id = $1 AND streamer_id = $2",
        [requestId, streamerId]
      );
    } else {
      await pool.query(
        "UPDATE song_requests SET status = $1 WHERE id = $2 AND streamer_id = $3",
        [status, requestId, streamerId]
      );
    }

    res.json({ success: true, message: '신청곡 상태 업데이트 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '신청곡 상태 변경 실패' });
  }
});

// Delete a Song Request (Complete or Cancel)
app.delete('/api/streams/:id/requests/:requestId', async (req, res) => {
  const streamerId = req.params.id;
  const requestId = parseInt(req.params.requestId);

  try {
    await pool.query(
      'DELETE FROM song_requests WHERE id = $1 AND streamer_id = $2',
      [requestId, streamerId]
    );
    res.json({ success: true, message: '신청곡 제거 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '신청곡 제거 실패' });
  }
});

// Global store for active RTMP streams with metadata (e.g. allowRequests)
const activeStreams = new Map();

// Node Media Server Event Handlers
nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeMediaServer] postPublish', StreamPath);
  const parts = StreamPath.split('/');
  // StreamPath format is usually /Live/streamerId or /live/streamerId
  if (parts.length >= 3 && parts[1].toLowerCase() === 'live') {
    const streamerId = parts[2];
    // By default, allow requests and set a default title
    activeStreams.set(streamerId, { allowRequests: true, title: "실시간 음악 방송 송출 중" });
    console.log(`[Stream Started] Streamer "${streamerId}" is now LIVE with requests enabled.`);
  }
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeMediaServer] donePublish', StreamPath);
  const parts = StreamPath.split('/');
  if (parts.length >= 3 && parts[1].toLowerCase() === 'live') {
    const streamerId = parts[2];
    activeStreams.delete(streamerId);
    console.log(`[Stream Ended] Streamer "${streamerId}" is now OFFLINE.`);
  }
});

// API to get active streams
app.get('/api/streams/active', (req, res) => {
  const list = [];
  activeStreams.forEach((val, key) => {
    list.push({ id: key, allowRequests: val.allowRequests, title: val.title });
  });
  res.json({ activeStreams: list });
});

// API to toggle song requests for a stream
app.post('/api/streams/:id/allow-requests', (req, res) => {
  const streamerId = req.params.id;
  const { allowRequests } = req.body;
  
  if (activeStreams.has(streamerId)) {
    const info = activeStreams.get(streamerId);
    info.allowRequests = !!allowRequests;
    activeStreams.set(streamerId, info);
  } else {
    // If stream offline but setting is changed, save it anyway
    activeStreams.set(streamerId, { allowRequests: !!allowRequests, title: "실시간 음악 방송" });
  }
  
  console.log(`[Stream Config] Streamer "${streamerId}" updated allowRequests to ${!!allowRequests}`);
  res.json({ success: true, allowRequests: !!allowRequests });
});

// API to mock/start broadcast directly from web UI
app.post('/api/streams/:id/broadcast', (req, res) => {
  const streamerId = req.params.id;
  const { isBroadcasting, title } = req.body;
  
  if (isBroadcasting) {
    const info = activeStreams.get(streamerId) || { allowRequests: true };
    info.title = title || "실시간 라이브 방송";
    activeStreams.set(streamerId, info);
    console.log(`[Mock Stream Started] Streamer "${streamerId}" is now LIVE with title: ${info.title}`);
  } else {
    activeStreams.delete(streamerId);
    console.log(`[Mock Stream Ended] Streamer "${streamerId}" is now OFFLINE.`);
  }
  
  res.json({ success: true, isLive: isBroadcasting });
});

// Start Server first, then try initializing DB and RTMP Media Server in background
app.listen(PORT, () => {
  console.log(`Zupasu web server running at http://localhost:${PORT}`);
  
  // Start RTMP/HTTP-FLV Media Server
  nms.run();
  
  // Init DB
  initDb().catch(err => {
    console.error('Failed to initialize Supabase DB tables:', err.message);
  });
});
