// Mock Data for Platform
const STREAMERS = [
  {
    id: 'yebit',
    artist: '예빛 (Yebit)',
    title: '조용한 밤, 마음에 위로가 되는 통기타 라이브',
    genre: 'acoustic',
    viewers: 342,
    thumbnail: 'yebit_cover.png',
    songs: [
      '너와 나의 가을밤',
      '위로의 노래',
      '빗속에서 너를 부른다',
      '끝나지 않을 이야기'
    ]
  },
  {
    id: 'djcloud',
    artist: 'DJ Cloud',
    title: '퇴근길을 힙하게 만들어줄 미니멀 테크노 세션 🎧',
    genre: 'electronic',
    viewers: 1205,
    thumbnail: 'dj_cloud_cover.png',
    songs: [
      'Midnight Pulse (Original Mix)',
      'Subway Rhythm (Extended Mix)',
      'City Lights (Deep House Dub)',
      'Neon Dreams'
    ]
  },
  {
    id: 'thewaves',
    artist: 'The Waves',
    title: '홍대 인디 밴드 연습실 실시간 잼 라이브 🎸',
    genre: 'band',
    viewers: 489,
    thumbnail: 'the_waves_cover.png',
    songs: [
      '바람을 타고 떠나자',
      'Blue Horizon',
      'Crash and Burn',
      '우리들의 사계절'
    ]
  },
  {
    id: 'minwoo',
    artist: '민우 (Minwoo)',
    title: '비 오는 날 카페에서 듣기 좋은 재즈 피아노 🎹',
    genre: 'jazz',
    viewers: 211,
    thumbnail: 'minwoo_jazz_cover.png',
    songs: [
      'Autumn Leaves (Piano Trio ver.)',
      'Waltz for Debby',
      'Blue in Green',
      '서울의 비 내리는 밤'
    ]
  }
];

// Mock Chat templates for simulation
const MOCK_CHAT_TEMPLATES = [
  { author: '음악조아', text: '기타 톤 진짜 대박이네요..' },
  { author: 'Hobbyist', text: '오늘 부르시는 곡 정보가 어떻게 되나요?' },
  { author: 'RainyDay', text: '오늘 날씨랑 선곡이 완전 찰떡이에요 ㅠㅠ' },
  { author: 'SynthWave', text: '드럼 볼륨 조금만 더 키워줄 수 있나요?' },
  { author: '재즈덕후', text: '솔로 연주 부분 닭살 돋았습니다 ㄷㄷ' },
  { author: '뮤직이즈라이프', text: '위뮤직 음질 진짜 깔끔하네요. 치지직보다 좋은듯?' },
  { author: '비트메이커', text: 'MR 사운드 디테일 미쳤다' }
];

const MOCK_DONATIONS = [
  { author: '커피러버', amount: '₩5,000', text: '커피 한 잔 값 보내드립니다! 노래 너무 좋아요.' },
  { author: '퇴근희망러', amount: '₩10,000', text: '덕분에 오늘 하루 피로가 다 날아가네요.' },
  { author: '음악은국경이없어', amount: '₩30,000', text: '다음 곡은 꼭 제가 신청한 곡으로 들려주세요 ㅎㅎ 화이팅!' }
];

// App State
let currentTheme = 'light';
let activeStreamer = null;
let chatInterval = null;
let requestQueue = [];
let currentUser = null; // Session management
let streamerPollInterval = null;
let isBroadcasting = false; // Mock broadcast state
let flvPlayer = null; // Real RTMP/HTTP-FLV player instance

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const logoBtn = document.getElementById('logo-btn');
const streamGrid = document.getElementById('stream-grid');
const lobbyView = document.getElementById('lobby-view');
const liveView = document.getElementById('live-view');
const backToLobbyBtn = document.getElementById('back-to-lobby');
const ticketSponsorBtn = document.getElementById('ticket-sponsor-btn');

const liveArtistName = document.getElementById('live-artist-name');
const liveStreamTitle = document.getElementById('live-stream-title');

const tabChat = document.getElementById('tab-chat');
const tabRequest = document.getElementById('tab-request');
const panelChat = document.getElementById('panel-chat');
const panelRequest = document.getElementById('panel-request');

const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

const requestList = document.getElementById('request-list');
const requestForm = document.getElementById('request-form');
const requestSongSelect = document.getElementById('request-song-select');
const requestSponsorMsg = document.getElementById('request-sponsor-msg');
const queueCountSpan = document.getElementById('queue-count');

// Auth DOM Elements
const headerAuthArea = document.getElementById('header-auth-area');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const dropdownUsername = document.getElementById('dropdown-username');

const authModal = document.getElementById('auth-modal');
const modalCloseBtn = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const switchToSignupLink = document.getElementById('switch-to-signup');
const switchToLoginLink = document.getElementById('switch-to-login');

// Streamer Studio DOM Elements
const streamerView = document.getElementById('streamer-view');
const streamerStudioBtn = document.getElementById('streamer-studio-btn');
const exitStreamerBtn = document.getElementById('exit-streamer-btn');
const studioBroadcastToggle = document.getElementById('studio-broadcast-toggle');
const studioStreamStatusText = document.getElementById('studio-stream-status-text');
const studioStreamTitleInput = document.getElementById('studio-stream-title');
const studioRequestList = document.getElementById('studio-request-list');
const studioQueueCount = document.getElementById('studio-queue-count');

// Initialize Platform
document.addEventListener('DOMContentLoaded', () => {
  startLobbyPolling();
  checkUserSession();
  setupEventListeners();
  updateQueueCount();
});

// Check LocalStorage for Active Session
function checkUserSession() {
  const session = localStorage.getItem('currentUser');
  if (session) {
    currentUser = JSON.parse(session);
  }
  renderAuthArea();
}

// Render Header Authentication UI
function renderAuthArea() {
  headerAuthArea.innerHTML = '';
  
  if (currentUser) {
    // User is logged in: Show profile icon button
    const profileBtn = document.createElement('button');
    profileBtn.className = 'icon-btn';
    profileBtn.id = 'profile-toggle-btn';
    profileBtn.title = '프로필 메뉴';
    profileBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    `;
    
    // Bind click event to profile button for dropdown
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
    });
    
    headerAuthArea.appendChild(profileBtn);
    dropdownUsername.textContent = `${currentUser.nickname} 님`;
  } else {
    // User is logged out: Show Login text button
    const loginBtn = document.createElement('button');
    loginBtn.className = 'secondary-btn';
    loginBtn.style.padding = '0.4rem 0.8rem';
    loginBtn.style.fontSize = '0.8rem';
    loginBtn.textContent = '로그인';
    
    loginBtn.addEventListener('click', openAuthModal);
    
    headerAuthArea.appendChild(loginBtn);
    dropdownUsername.textContent = '로그인 필요';
  }
}

// Open Login Modal
function openAuthModal() {
  authModal.classList.add('active');
  showLoginForm();
}

// Close Login Modal
function closeAuthModal() {
  authModal.classList.remove('active');
}

function showLoginForm() {
  modalTitle.textContent = '로그인';
  loginForm.classList.add('active');
  signupForm.classList.remove('active');
}

function showSignupForm() {
  modalTitle.textContent = '회원가입';
  signupForm.classList.add('active');
  loginForm.classList.remove('active');
}

// Event Listeners Setup
function setupEventListeners() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggleBtn.innerHTML = currentTheme === 'dark' 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  });

  // Lobby navigation
  logoBtn.addEventListener('click', exitLiveRoom);
  backToLobbyBtn.addEventListener('click', exitLiveRoom);

  // Genre chips
  const genreChips = document.querySelectorAll('.genre-chip');
  genreChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      genreChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadStreams(chip.dataset.genre);
    });
  });

  // Mixer Slider Event Listeners
  ['vocal', 'inst', 'mr'].forEach(channel => {
    const slider = document.getElementById(`vol-${channel}`);
    const display = document.getElementById(`vol-${channel}-val`);
    slider.addEventListener('input', (e) => {
      display.textContent = `${e.target.value}%`;
    });
  });

  // Sidebar Tab Switching
  tabChat.addEventListener('click', () => {
    tabChat.classList.add('active');
    tabRequest.classList.remove('active');
    panelChat.classList.add('active');
    panelRequest.classList.remove('active');
  });

  tabRequest.addEventListener('click', () => {
    tabRequest.classList.add('active');
    tabChat.classList.remove('active');
    panelRequest.classList.add('active');
    panelChat.classList.remove('active');
  });

  // User chat submit
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Check if user is logged in
    const nickname = currentUser ? currentUser.nickname : '나 (시청자)';
    addChatMessage(nickname, text, false);
    chatInput.value = '';
    
    // Simulate artist response back occasionally
    setTimeout(() => {
      if (activeStreamer) {
        addChatMessage(activeStreamer.artist, `와! 감사합니다. 😊 다음 노래 들려드릴게요.`, false, true);
      }
    }, 1500);
  });

  // User song request submit
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const song = requestSongSelect.value;
    const msg = requestSponsorMsg.value.trim();
    if (!song) return;
    
    const nickname = currentUser ? currentUser.nickname : '익명의 리스너';
    const requesterLabel = msg ? `${nickname} (후원 메시지: ${msg})` : nickname;

    try {
      const response = await fetch(`/api/streams/${activeStreamer.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: song,
          requester: requesterLabel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '신청곡 등록 중 오류가 발생했습니다.');
      }

      requestSponsorMsg.value = '';
      
      // Update UI Queue from Database
      await fetchRequestQueue(activeStreamer.id);
      
      // System notification in chat
      addChatMessage('SYSTEM', `[신청곡 접수 완료] "${song}"이 데이터베이스 대기열에 추가되었습니다.`, false);
    } catch (err) {
      alert(err.message);
    }
  });

  // Direct Sponsor Button Click
  ticketSponsorBtn.addEventListener('click', () => {
    const amount = '₩' + (Math.floor(Math.random() * 5) * 5000 + 5000).toLocaleString();
    const nickname = currentUser ? currentUser.nickname : '나 (후원)';
    addChatMessage(nickname, `공연 라이브 티켓을 후원했습니다.`, true, false, amount);
  });

  // Modal Control Event Listeners
  modalCloseBtn.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  switchToSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
  });

  switchToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // Handle Signup Submit (REST API Call)
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const nickname = document.getElementById('signup-nickname').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, nickname, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '회원가입에 실패했습니다.');
      }

      alert('회원가입이 완료되었습니다. 가입한 정보로 로그인해 주세요.');
      signupForm.reset();
      showLoginForm();
    } catch (err) {
      alert(err.message);
    }
  });

  // Handle Login Submit (REST API Call)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '로그인에 실패했습니다.');
      }

      const data = await response.json();
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      loginForm.reset();
      closeAuthModal();
      renderAuthArea();
      
      if (activeStreamer) {
        addChatMessage('SYSTEM', `[로그인 성공] ${currentUser.nickname} 님으로 접속되었습니다.`, false);
      }
    } catch (err) {
      alert(err.message);
    }
  });

  // Handle Logout Click
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    profileDropdown.classList.remove('active');
    renderAuthArea();
    
    if (activeStreamer) {
      addChatMessage('SYSTEM', `[로그아웃] 세션이 종료되었습니다.`, false);
    }
  });

  // Outside click closes dropdown
  document.addEventListener('click', (e) => {
    if (!profileDropdown.contains(e.target) && e.target.id !== 'profile-toggle-btn') {
      profileDropdown.classList.remove('active');
    }
  });

  // --- Streamer Studio Events ---

  // Click Streamer Studio from dropdown
  streamerStudioBtn.addEventListener('click', (e) => {
    e.preventDefault();
    profileDropdown.classList.remove('active');
    
    if (!currentUser) {
      alert('스트리머 스튜디오는 로그인 상태에서만 입장 가능합니다.');
      openAuthModal();
      return;
    }
    
    enterStreamerStudio();
  });

  // Exit Streamer Studio
  exitStreamerBtn.addEventListener('click', exitStreamerStudio);

  // Toggle Broadcast (Start/Stop)
  studioBroadcastToggle.addEventListener('click', () => {
    isBroadcasting = !isBroadcasting;
    const monitorBox = document.querySelector('#streamer-view .video-container');
    
    if (isBroadcasting) {
      monitorBox.classList.remove('offline');
      studioStreamStatusText.textContent = `송출 중 (실시간 연결 성공) - ${studioStreamTitleInput.value}`;
      studioBroadcastToggle.textContent = '방송 종료하기';
      studioBroadcastToggle.style.backgroundColor = 'var(--danger-color)';
      studioBroadcastToggle.style.borderColor = 'var(--danger-color)';
    } else {
      monitorBox.classList.add('offline');
      studioStreamStatusText.textContent = '방송 송출 준비 완료 (오프라인)';
      studioBroadcastToggle.textContent = '방송 시작하기';
      studioBroadcastToggle.style.backgroundColor = 'var(--accent-color)';
      studioBroadcastToggle.style.borderColor = 'var(--accent-color)';
    }
  });
}

// Fetch requests queue from Server/DB
async function fetchRequestQueue(streamerId) {
  try {
    const response = await fetch(`/api/streams/${streamerId}/requests`);
    if (!response.ok) throw new Error('대기열 조회를 실패했습니다.');
    
    const data = await response.json();
    requestQueue = data.queue;
    
    renderRequestQueue();
    updateQueueCount();
  } catch (err) {
    console.error(err);
  }
}

// Fetch active streams from server
async function fetchActiveStreams() {
  try {
    const response = await fetch('/api/streams/active');
    if (!response.ok) throw new Error('활성 스트리머 조회 실패');
    const data = await response.json();
    return data.activeStreams;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Lobby polling management
let lobbyInterval = null;

function startLobbyPolling() {
  if (lobbyInterval) return;
  
  // Set up periodic poll every 5 seconds
  lobbyInterval = setInterval(() => {
    const activeChip = document.querySelector('.genre-chip.active');
    const currentGenre = activeChip ? activeChip.dataset.genre : 'all';
    loadStreams(currentGenre);
  }, 5000);
}

function stopLobbyPolling() {
  if (lobbyInterval) {
    clearInterval(lobbyInterval);
    lobbyInterval = null;
  }
}

// Load Streamers inside lobby
async function loadStreams(genreFilter) {
  const activeStreams = await fetchActiveStreams();
  
  streamGrid.innerHTML = '';
  const filtered = genreFilter === 'all' 
    ? STREAMERS 
    : STREAMERS.filter(s => s.genre === genreFilter);

  filtered.forEach(stream => {
    const isLive = activeStreams.includes(stream.id);
    const card = document.createElement('div');
    card.className = `stream-card ${isLive ? 'is-live' : 'is-offline'}`;
    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${stream.thumbnail}" alt="${stream.artist}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23555%22 font-family=%22sans-serif%22 font-size=%2212%22>${stream.artist}</text></svg>'">
        ${isLive 
          ? '<span class="live-badge">LIVE</span>' 
          : '<span class="offline-badge">OFFLINE</span>'}
        <span class="viewer-count">${isLive ? `${stream.viewers.toLocaleString()}명 감상 중` : '오프라인'}</span>
      </div>
      <div class="card-info">
        <div class="card-meta">
          <span class="card-genre">${stream.genre}</span>
          <span class="card-artist">${stream.artist}</span>
        </div>
        <div class="card-title">${stream.title}</div>
      </div>
    `;
    card.addEventListener('click', () => enterLiveRoom(stream));
    streamGrid.appendChild(card);
  });
}

// Play Real HTTP-FLV Live Stream using flv.js
function initLiveVideo(streamerId) {
  const videoElement = document.getElementById('video-element');
  const placeholder = document.getElementById('visualizer-placeholder');
  
  // Reset visibility
  videoElement.style.display = 'none';
  placeholder.style.display = 'flex';

  if (flvjs.isSupported()) {
    // Generate stream URL (Using current hostname)
    const streamUrl = `http://${window.location.hostname}:8000/Live/${streamerId}.flv`;
    
    flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: streamUrl,
      isLive: true,
      cors: true,
      enableWorker: true
    });
    flvPlayer.attachMediaElement(videoElement);
    flvPlayer.load();

    // Start playing
    const playPromise = flvPlayer.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Stream successfully received: show video
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
      }).catch(err => {
        // Stream is offline or failed (keep showing animated visualizer placeholder)
        console.log("Live stream offline or auto-play blocked, showing visualizer.");
      });
    }

    // Handle FLV errors gracefully (e.g. stream drops/offline)
    flvPlayer.on(flvjs.Events.ERROR, (errType, errDetail) => {
      console.log("flv.js error type:", errType, "detail:", errDetail);
      videoElement.style.display = 'none';
      placeholder.style.display = 'flex';
    });
  }
}

// Enter Live Room Page
async function enterLiveRoom(stream) {
  stopLobbyPolling();
  
  activeStreamer = stream;
  lobbyView.classList.remove('active');
  liveView.classList.add('active');

  liveArtistName.textContent = stream.artist;
  liveStreamTitle.textContent = stream.title;

  // Clear and setup song request select box
  requestSongSelect.innerHTML = '<option value="" disabled selected>신청할 곡을 골라보세요...</option>';
  stream.songs.forEach(song => {
    const opt = document.createElement('option');
    opt.value = song;
    opt.textContent = song;
    requestSongSelect.appendChild(opt);
  });

  // Pull queue data from SQLite DB
  await fetchRequestQueue(stream.id);

  // Initialize and try playing actual live streaming
  initLiveVideo(stream.id);

  // Clear chat box and put welcome message
  chatBox.innerHTML = '';
  addChatMessage('SYSTEM', `"${stream.artist}"의 고음질 라이브 방송에 입장했습니다.`, false);
  
  // Start simulation chat generator
  startChatSimulation();
}

// Exit Live Room to lobby
function exitLiveRoom() {
  activeStreamer = null;

  // Clean up flv.js player
  if (flvPlayer) {
    try {
      flvPlayer.pause();
      flvPlayer.unload();
      flvPlayer.destroy();
    } catch (e) {
      console.log(e);
    }
    flvPlayer = null;
  }

  liveView.classList.remove('active');
  lobbyView.classList.add('active');
  stopChatSimulation();
  
  startLobbyPolling();
}

// Chat simulation logic
function startChatSimulation() {
  stopChatSimulation(); // clear active intervals
  chatInterval = setInterval(() => {
    const randomSeed = Math.random();
    
    if (randomSeed < 0.15) {
      // Donation simulation
      const don = MOCK_DONATIONS[Math.floor(Math.random() * MOCK_DONATIONS.length)];
      addChatMessage(don.author, don.text, true, false, don.amount);
    } else {
      // Normal chat simulation
      const chat = MOCK_CHAT_TEMPLATES[Math.floor(Math.random() * MOCK_CHAT_TEMPLATES.length)];
      addChatMessage(chat.author, chat.text, false);
    }
  }, 3000);
}

function stopChatSimulation() {
  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }
}

// Render Request Queue items
function renderRequestQueue() {
  requestList.innerHTML = '';
  requestQueue.forEach((req, idx) => {
    const item = document.createElement('div');
    item.className = 'request-item';
    
    const isPlaying = req.status === 'playing';
    
    item.innerHTML = `
      <div class="request-details">
        <span class="request-title">${req.title}</span>
        <span class="request-requester">신청자: ${req.requester}</span>
      </div>
      <span class="request-status ${isPlaying ? 'status-playing' : 'status-waiting'}">
        ${isPlaying ? 'PLAYING' : 'WAITING'}
      </span>
    `;
    requestList.appendChild(item);
  });
}

function updateQueueCount() {
  queueCountSpan.textContent = requestQueue.length;
}

// Add chat bubble
function addChatMessage(author, text, isDonation = false, isStreamer = false, donationAmount = '') {
  const bubble = document.createElement('div');
  bubble.className = isDonation ? 'chat-bubble chat-donation' : 'chat-bubble';

  const authorSpan = document.createElement('span');
  authorSpan.className = 'chat-author';
  authorSpan.textContent = author;
  
  if (isStreamer) {
    authorSpan.style.color = 'var(--live-color)';
    authorSpan.textContent = `🎤 ${author}`;
  }

  bubble.appendChild(authorSpan);

  if (isDonation) {
    const amountSpan = document.createElement('span');
    amountSpan.className = 'donation-amount';
    amountSpan.textContent = donationAmount;
    bubble.appendChild(amountSpan);
  }

  const textSpan = document.createElement('span');
  textSpan.className = 'chat-text';
  textSpan.textContent = ` ${text}`;
  bubble.appendChild(textSpan);

  chatBox.appendChild(bubble);
  
  // Auto scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Streamer Studio Business Logic ---

function enterStreamerStudio() {
  stopLobbyPolling();
  
  lobbyView.classList.remove('active');
  liveView.classList.remove('active');
  streamerView.classList.add('active');

  // Setup mock layout
  document.querySelector('#streamer-view .video-container').classList.add('offline');
  studioStreamStatusText.textContent = '방송 송출 준비 완료 (오프라인)';
  studioBroadcastToggle.textContent = '방송 시작하기';
  studioBroadcastToggle.style.backgroundColor = 'var(--accent-color)';
  studioBroadcastToggle.style.borderColor = 'var(--accent-color)';
  isBroadcasting = false;

  // Streamer ID is mapped to logged in username
  activeStreamer = {
    id: currentUser.username,
    artist: currentUser.nickname
  };

  // Fetch Requests queue from DB
  fetchStreamerRequests();

  // Start polling every 3 seconds to keep streamer UI sync with viewer's requests
  streamerPollInterval = setInterval(fetchStreamerRequests, 3000);
}

function exitStreamerStudio() {
  activeStreamer = null;
  if (streamerPollInterval) {
    clearInterval(streamerPollInterval);
    streamerPollInterval = null;
  }
  streamerView.classList.remove('active');
  lobbyView.classList.add('active');
  
  startLobbyPolling();
}

// Fetch requests queue for current streamer
async function fetchStreamerRequests() {
  if (!activeStreamer) return;
  try {
    const response = await fetch(`/api/streams/${activeStreamer.id}/requests`);
    if (!response.ok) throw new Error('대기열 조회를 실패했습니다.');
    
    const data = await response.json();
    const queue = data.queue;

    studioQueueCount.textContent = queue.length;
    renderStreamerRequests(queue);
  } catch (err) {
    console.error(err);
  }
}

// Render requests for streamer with control buttons
function renderStreamerRequests(queue) {
  studioRequestList.innerHTML = '';
  if (queue.length === 0) {
    studioRequestList.innerHTML = `
      <div style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 2rem 0;">
        대기 중인 신청곡이 없습니다.
      </div>
    `;
    return;
  }

  queue.forEach(req => {
    const item = document.createElement('div');
    item.className = 'request-item';

    const isPlaying = req.status === 'playing';

    item.innerHTML = `
      <div class="request-details">
        <span class="request-title" style="color: ${isPlaying ? 'var(--live-color)' : 'inherit'};">${req.title}</span>
        <span class="request-requester">신청자: ${req.requester}</span>
      </div>
      <div class="studio-actions">
        ${!isPlaying 
          ? `<button class="btn-playing" onclick="updateRequestStatus(${req.id}, 'playing')">부르기</button>`
          : `<button class="btn-complete" onclick="deleteRequest(${req.id})">완료</button>`
        }
        <button class="btn-delete" onclick="deleteRequest(${req.id})">삭제</button>
      </div>
    `;
    studioRequestList.appendChild(item);
  });
}

// Global functions for inline HTML event bindings (called from renderStreamerRequests)
window.updateRequestStatus = async function(requestId, newStatus) {
  if (!activeStreamer) return;
  try {
    const response = await fetch(`/api/streams/${activeStreamer.id}/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('상태 변경 실패');
    fetchStreamerRequests();
  } catch (err) {
    alert(err.message);
  }
};

window.deleteRequest = async function(requestId) {
  if (!activeStreamer) return;
  try {
    const response = await fetch(`/api/streams/${activeStreamer.id}/requests/${requestId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('신청곡 완료/제거 실패');
    fetchStreamerRequests();
  } catch (err) {
    alert(err.message);
  }
};
