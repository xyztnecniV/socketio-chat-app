(function () {
  const socket = io('/chat');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send');
  const messagesEl = document.getElementById('messages');
  const statusEl = document.getElementById('status');
  const usersEl = document.getElementById('users');
  const roomListEl = document.getElementById('room-list');
  const roomForm = document.getElementById('room-form');
  const roomInput = document.getElementById('room-input');
  const currentRoomEl = document.getElementById('current-room');

  let currentRoom = 'global';
  let me = null;
  const users = new Map();

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  }

  function renderUsers(list) {
    usersEl.innerHTML = '';
    list.forEach((u) => {
      const li = document.createElement('li');
      li.className = 'user';
      li.innerHTML = `<img src="${u.avatar}" alt="${escapeHtml(u.name)} avatar" class="avatar"/><span class="name">${escapeHtml(u.name)}</span>`;
      li.addEventListener('click', () => startPrivate(u.id, u.name));
      usersEl.appendChild(li);
      users.set(u.id, u);
    });
  }

  function addMessage(msg, options = {}) {
    const el = document.createElement('div');
    el.className = 'message';
    const isMe = msg.from === (me && me.id);
    el.innerHTML = `
      <div class="message-inner ${isMe ? 'me' : ''}">
        <img class="avatar" src="${msg.avatar}" alt="${escapeHtml(msg.name)} avatar" />
        <div class="bubble">
          <div class="meta"><span class="name">${escapeHtml(msg.name)}</span> <span class="time">${formatTime(msg.ts)}</span></div>
          <div class="text">${escapeHtml(msg.text)}</div>
        </div>
      </div>
    `;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function startPrivate(id, name) {
    const text = prompt(`Send private message to ${name} (cancel to abort):`);
    if (!text) return;
    socket.emit('private message', { toId: id, text });
  }

  sendBtn.addEventListener('click', () => {
    const text = messageInput.value && messageInput.value.trim();
    if (!text) return;
    socket.emit('message', { room: currentRoom, text });
    messageInput.value = '';
    messageInput.focus();
  });

  messageInput.addEventListener('keydown', (e) => {
    socket.emit('typing', { room: currentRoom, typing: true });
    if (e.key === 'Enter') {
      sendBtn.click();
      socket.emit('typing', { room: currentRoom, typing: false });
    }
  });

  roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const room = roomInput.value && roomInput.value.trim();
    if (!room) return;
    joinRoom(room);
    roomInput.value = '';
  });

  function joinRoom(room) {
    socket.emit('join', { room });
    currentRoom = room;
    currentRoomEl.textContent = `#${room}`;
    messagesEl.innerHTML = '';
    // fetch history
    fetch(`/api/history?room=${encodeURIComponent(room)}&limit=100`).then((r) => r.json()).then((data) => {
      (data.messages || []).forEach((m) => addMessage(m));
    });
  }

  socket.on('connected', (payload) => {
    me = payload;
  });

  socket.on('presence', (list) => {
    renderUsers(list);
    // render room list from presence (simple heuristic)
    const rooms = ['global'];
    roomListEl.innerHTML = '';
    rooms.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = `#${r}`;
      li.addEventListener('click', () => joinRoom(r));
      roomListEl.appendChild(li);
    });
  });

  socket.on('message', (msg) => {
    addMessage(msg);
  });

  socket.on('private message', (msg) => {
    alert(`Private message from ${msg.from}: ${msg.text}`);
  });

  socket.on('system', (s) => {
    const el = document.createElement('div');
    el.className = 'system';
    el.textContent = `${s.text}`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  socket.on('typing', (u) => {
    statusEl.textContent = u.typing ? `${u.name} is typing...` : '';
  });

  socket.on('connect', () => {
    statusEl.textContent = 'Connected';
    statusEl.className = 'status online';
    joinRoom('global');
  });

  socket.on('disconnect', () => {
    statusEl.textContent = 'Disconnected';
    statusEl.className = 'status offline';
  });

  socket.on('connect_error', () => {
    statusEl.textContent = 'Connection error';
    statusEl.className = 'status offline';
  });
})();
