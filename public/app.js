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
