(function () {
  const socket = io();
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messages = document.getElementById('messages');
  const status = document.getElementById('status');

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addMessage(msg) {
    const li = document.createElement('li');
    li.innerHTML = escapeHtml(msg);
    messages.appendChild(li);
    window.scrollTo(0, document.body.scrollHeight);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const value = input.value && input.value.trim();
    if (value) {
      socket.emit('chat message', value);
      input.value = '';
      input.focus();
    }
  });

  socket.on('chat message', function (msg) {
    addMessage(msg);
  });

  socket.on('connect', () => {
    status.textContent = 'Connected';
    status.className = 'ok';
  });

  socket.on('disconnect', () => {
    status.textContent = 'Disconnected';
    status.className = 'bad';
  });

  socket.io.on('reconnect_attempt', () => {
    status.textContent = 'Reconnecting...';
    status.className = 'warn';
  });

  socket.on('connect_error', (err) => {
    status.textContent = 'Connection error';
    status.className = 'bad';
    console.error('Socket connection error:', err);
  });
})();
