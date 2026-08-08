const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const healthStatusEl = document.getElementById('health-status');
const messageCountEl = document.getElementById('message-count');
const messagesListEl = document.getElementById('messages-list');

async function loadStats() {
  try {
    const [healthRes, statsRes, messagesRes] = await Promise.all([
      fetch('/api/health'),
      fetch('/api/stats'),
      fetch('/api/messages'),
    ]);

    const health = await healthRes.json();
    const stats = await statsRes.json();
    const messages = await messagesRes.json();

    healthStatusEl.textContent = health.status === 'ok' ? 'Backend online and ready' : 'Backend unavailable';
    messageCountEl.textContent = `${stats.totalMessages} submissions`;

    messagesListEl.innerHTML = messages
      .slice(0, 5)
      .map(
        (entry) => `
          <article class="message-item">
            <strong>${entry.name}</strong>
            <p>${entry.message}</p>
            <small>${new Date(entry.createdAt).toLocaleString()}</small>
          </article>
        `,
      )
      .join('');
  } catch (error) {
    healthStatusEl.textContent = 'Backend unavailable';
    messageCountEl.textContent = '0 submissions';
    messagesListEl.innerHTML = '<p>Could not load submissions.</p>';
    console.error(error);
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusEl.textContent = 'Sending...';

  const payload = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    message: document.getElementById('message').value,
  };

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit');
    }

    statusEl.textContent = 'Thanks! Your message is now stored securely.';
    form.reset();
    loadStats();
  } catch (error) {
    statusEl.textContent = error.message;
  }
});

loadStats();

// ===== Live Chat =====

const NAME_KEY = 'futurevisions.chat.name';

const chatBtn = document.getElementById('live-chat-btn');
const nameModal = document.getElementById('chat-name-modal');
const nameInput = document.getElementById('chat-name-input');
const nameEnterBtn = document.getElementById('chat-name-enter');
const nameCancelBtn = document.getElementById('chat-name-cancel');
const nameError = document.getElementById('chat-name-error');
const chatWidget = document.getElementById('chat-widget');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');

let chatName = localStorage.getItem(NAME_KEY) || '';
let chatSocket = null;
let pollTimer = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function openNameModal() {
  nameError.textContent = '';
  nameInput.value = chatName;
  nameModal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 50);
}

function closeNameModal() {
  nameModal.classList.add('hidden');
}

function openChatWidget() {
  nameModal.classList.add('hidden');
  chatWidget.classList.remove('hidden');
  chatInput.focus();
  connectWebSocket();
  startPolling();
  loadChatHistory();
}

function closeChatWidget() {
  chatWidget.classList.add('hidden');
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function createMessageNode(entry) {
  const isOwn = entry.name === chatName;
  const bubble = document.createElement('div');
  bubble.className = `chat-msg${isOwn ? ' chat-msg--own' : ''}`;
  bubble.dataset.id = entry.id;

  const meta = document.createElement('div');
  meta.className = 'chat-msg__meta';
  meta.textContent = entry.name;

  const time = document.createElement('span');
  time.className = 'chat-msg__time';
  time.textContent = new Date(entry.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  meta.appendChild(time);

  const body = document.createElement('div');
  body.className = 'chat-msg__body';
  body.textContent = entry.message;

  bubble.appendChild(meta);
  bubble.appendChild(body);
  return bubble;
}

function renderMessage(entry) {
  if (!entry || entry.id == null) return;
  // Avoid duplicates: if a node with this id already exists, skip.
  if (chatMessagesEl.querySelector(`[data-id="${entry.id}"]`)) return;
  chatMessagesEl.appendChild(createMessageNode(entry));
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function renderHistory(messages) {
  // Rebuild the full list from the server, deduplicating by id.
  chatMessagesEl.innerHTML = '';
  if (!messages || messages.length === 0) {
    chatMessagesEl.innerHTML = '<p class="chat-widget__empty">Καμία συνομιλία ακόμα. Γίνε ο πρώτος!</p>';
    return;
  }
  const seen = new Set();
  messages.forEach((entry) => {
    if (!entry || entry.id == null || seen.has(entry.id)) return;
    seen.add(entry.id);
    chatMessagesEl.appendChild(createMessageNode(entry));
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function loadChatHistory() {
  try {
    const response = await fetch('/api/chat/messages');
    const messages = await response.json();
    renderHistory(messages);
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
}

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${location.host}/ws/chat`;

  try {
    chatSocket = new WebSocket(url);
    chatSocket.onopen = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    chatSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat:message' && data.message) {
          renderMessage(data.message);
        }
      } catch {
        // Ignore malformed frames.
      }
    };
    chatSocket.onclose = () => {
      chatSocket = null;
      startPolling();
    };
    chatSocket.onerror = () => {
      chatSocket = null;
      startPolling();
    };
  } catch {
    chatSocket = null;
    startPolling();
  }
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const response = await fetch('/api/chat/messages');
      const messages = await response.json();
      renderHistory(messages);
    } catch {
      // Poll again next tick.
    }
  }, 2000);
}

async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  try {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: chatName, message }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send message');
    }

    chatInput.value = '';

    // Optimistically render own message for instant feedback.
    const entry = await response.json();
    renderMessage(entry);

    // If no WebSocket, the poll will pick it up too (dedicated by id later).
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

chatBtn.addEventListener('click', () => {
  if (chatName) {
    openChatWidget();
  } else {
    openNameModal();
  }
});

nameEnterBtn.addEventListener('click', () => {
  const value = nameInput.value.trim();
  if (!value) {
    nameError.textContent = 'Παρακαλώ εισάγετε το όνομά σας.';
    return;
  }
  chatName = value;
  localStorage.setItem(NAME_KEY, chatName);
  openChatWidget();
});

nameCancelBtn.addEventListener('click', closeNameModal);

nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    nameEnterBtn.click();
  }
});

nameModal.addEventListener('click', (event) => {
  if (event.target === nameModal) {
    closeNameModal();
  }
});

chatSendBtn.addEventListener('click', sendChatMessage);

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
});

chatCloseBtn.addEventListener('click', closeChatWidget);
