// Bitly System Design - Client Frontend Logic

let currentShortCode = '';

// DOM Elements
const shortenForm = document.getElementById('shorten-form');
const originalUrlInput = document.getElementById('original-url-input');
const pasteBtn = document.getElementById('paste-btn');
const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
const advancedPanel = document.getElementById('advanced-options-panel');
const customAliasInput = document.getElementById('custom-alias-input');
const expirationSelect = document.getElementById('expiration-select');
const customDateContainer = document.getElementById('custom-date-container');
const customExpiryInput = document.getElementById('custom-expiry-input');

const resultBox = document.getElementById('result-box');
const resultShortUrl = document.getElementById('result-short-url');
const resultOriginalUrl = document.getElementById('result-original-url');
const resultCustomTag = document.getElementById('result-custom-tag');
const resultExpiryTag = document.getElementById('result-expiry-tag');
const copyBtn = document.getElementById('copy-btn');
const testRedirectBtn = document.getElementById('test-redirect-btn');
const viewStatsBtn = document.getElementById('view-stats-btn');

const toast = document.getElementById('toast');

// Telemetry Elements
const redisStatusVal = document.getElementById('redis-status-val');
const dbStatusVal = document.getElementById('db-status-val');
const counterRangeVal = document.getElementById('counter-range-val');

// Counter Inspector Elements
const inspectorInstanceId = document.getElementById('inspector-instance-id');
const inspectorCurrentCounter = document.getElementById('inspector-current-counter');
const inspectorMaxCounter = document.getElementById('inspector-max-counter');
const inspectorRemaining = document.getElementById('inspector-remaining');
const progressPercent = document.getElementById('progress-percent');
const tokenProgressFill = document.getElementById('token-progress-fill');

// Recent links tbody
const recentLinksTbody = document.getElementById('recent-links-tbody');

// Modal Elements
const statsModal = document.getElementById('stats-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const modalClicksCount = document.getElementById('modal-clicks-count');
const modalTargetUrl = document.getElementById('modal-target-url');
const modalReferrersList = document.getElementById('modal-referrers-list');
const modalClicksTbody = document.getElementById('modal-clicks-tbody');

// Show toast notification
function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// Toggle Advanced Options
toggleAdvancedBtn.addEventListener('click', () => {
  toggleAdvancedBtn.classList.toggle('active');
  advancedPanel.classList.toggle('show');
});

// Expiration select change
expirationSelect.addEventListener('change', () => {
  if (expirationSelect.value === 'custom') {
    customDateContainer.style.display = 'block';
  } else {
    customDateContainer.style.display = 'none';
  }
});

// Paste from Clipboard
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      originalUrlInput.value = text;
      originalUrlInput.focus();
    }
  } catch (err) {
    showToast('Clipboard permission denied');
  }
});

// Calculate expiration epoch timestamp based on selection
function getExpirationTimestamp() {
  const choice = expirationSelect.value;
  const now = Date.now();

  switch (choice) {
    case '1h':
      return Math.floor((now + 3600 * 1000) / 1000);
    case '24h':
      return Math.floor((now + 86400 * 1000) / 1000);
    case '7d':
      return Math.floor((now + 7 * 86400 * 1000) / 1000);
    case '30d':
      return Math.floor((now + 30 * 86400 * 1000) / 1000);
    case 'custom':
      if (customExpiryInput.value) {
        return Math.floor(new Date(customExpiryInput.value).getTime() / 1000);
      }
      return null;
    default:
      return null;
  }
}

// Handle Shorten Form Submit
shortenForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const originalUrl = originalUrlInput.value.trim();
  const alias = customAliasInput.value.trim() || undefined;
  const expirationTime = getExpirationTimestamp() || undefined;

  if (!originalUrl) return;

  try {
    const res = await fetch('/api/v1/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl, alias, expirationTime }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Error creating short URL');
      return;
    }

    currentShortCode = data.shortCode;

    // Display result card
    resultShortUrl.href = data.shortUrl;
    resultShortUrl.textContent = data.shortUrl;
    resultOriginalUrl.textContent = data.originalUrl;
    testRedirectBtn.href = data.shortUrl;

    if (data.isCustom) {
      resultCustomTag.style.display = 'inline-block';
    } else {
      resultCustomTag.style.display = 'none';
    }

    if (data.expiresAt) {
      resultExpiryTag.style.display = 'inline-block';
      resultExpiryTag.title = `Expires: ${new Date(data.expiresAt).toLocaleString()}`;
    } else {
      resultExpiryTag.style.display = 'none';
    }

    resultBox.style.display = 'block';
    showToast('Short URL generated successfully!');

    // Refresh telemetry and recent list
    loadTelemetry();
    loadRecentUrls();
  } catch (err) {
    showToast('Network error while creating link');
  }
});

// Copy button
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultShortUrl.textContent);
    showToast('Copied to clipboard!');
  } catch (err) {
    showToast('Failed to copy');
  }
});

// View Stats Button from Result Card
viewStatsBtn.addEventListener('click', () => {
  if (currentShortCode) {
    openStatsModal(currentShortCode);
  }
});

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));

    btn.classList.add('active');
    const tabId = `tab-${btn.dataset.tab}`;
    const target = document.getElementById(tabId);
    if (target) {
      target.classList.add('active');
    }
  });
});

// Load System Telemetry
async function loadTelemetry() {
  try {
    const [healthRes, counterRes] = await Promise.all([
      fetch('/api/v1/health'),
      fetch('/api/v1/counter/status'),
    ]);

    if (healthRes.ok) {
      const health = await healthRes.json();
      redisStatusVal.textContent = health.redis.mode;
      dbStatusVal.textContent = health.postgres.mode;
    }

    if (counterRes.ok) {
      const counter = await counterRes.json();
      counterRangeVal.textContent = `[${counter.currentCounter}..${counter.maxCounter}]`;

      // Update Inspector Tab
      inspectorInstanceId.textContent = counter.instanceId;
      inspectorCurrentCounter.textContent = counter.currentCounter;
      inspectorMaxCounter.textContent = counter.maxCounter;
      inspectorRemaining.textContent = counter.remainingInBatch;

      const totalBatch = counter.batchSize || 1000;
      const usedInBatch = totalBatch - counter.remainingInBatch;
      const pct = Math.min(100, Math.max(0, Math.round((usedInBatch / totalBatch) * 100)));

      progressPercent.textContent = `${pct}% allocated`;
      tokenProgressFill.style.width = `${pct}%`;
    }
  } catch (err) {
    console.warn('Telemetry load failed:', err);
  }
}

// Load Recent URLs
async function loadRecentUrls() {
  try {
    const res = await fetch('/api/v1/urls/recent?limit=15');
    if (!res.ok) return;

    const { urls } = await res.json();
    if (!urls || urls.length === 0) {
      recentLinksTbody.innerHTML = '<tr><td colspan="6" class="empty-state">No shortened URLs yet. Create one above!</td></tr>';
      return;
    }

    recentLinksTbody.innerHTML = urls
      .map((u) => {
        const fullShortUrl = `${window.location.origin}/${u.short_code}`;
        const isExpired = u.expires_at && new Date(u.expires_at) < new Date();
        const statusBadge = isExpired
          ? '<span class="badge-warning">Expired</span>'
          : '<span class="badge-success">Active</span>';

        return `
          <tr>
            <td>
              <a href="${fullShortUrl}" target="_blank" style="color: #67e8f9; font-weight:600; font-family: var(--font-mono); text-decoration: none;">
                /${u.short_code}
              </a>
              ${u.is_custom ? '<span class="badge-info" style="font-size:0.65rem; padding: 0.1rem 0.4rem;">Custom</span>' : ''}
            </td>
            <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${u.original_url}">
              ${u.original_url}
            </td>
            <td><strong>${u.click_count || 0}</strong></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="action-btn" style="padding: 0.3rem 0.7rem; font-size: 0.75rem;" onclick="openStatsModal('${u.short_code}')">
                Inspect
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.warn('Failed to load recent URLs:', err);
  }
}

// Open Stats Modal
window.openStatsModal = async function (shortCode) {
  try {
    const res = await fetch(`/api/v1/urls/${shortCode}/stats`);
    if (!res.ok) {
      showToast('Failed to load stats for link');
      return;
    }

    const data = await res.json();
    modalTitle.textContent = `Analytics: /${data.shortCode}`;
    modalClicksCount.textContent = data.clickCount;
    modalTargetUrl.textContent = data.originalUrl;

    // Render referrers
    const referrers = Object.entries(data.referrerBreakdown || {});
    if (referrers.length === 0) {
      modalReferrersList.innerHTML = '<div class="empty-hint">No referrers logged yet.</div>';
    } else {
      modalReferrersList.innerHTML = referrers
        .map(([ref, count]) => `
          <div style="display:flex; justify-content:space-between; padding:0.4rem 0.6rem; background:rgba(255,255,255,0.03); border-radius:4px; margin-bottom:0.3rem; font-size:0.85rem;">
            <span>${ref}</span>
            <span style="font-weight:700; color:#38bdf8;">${count}</span>
          </div>
        `)
        .join('');
    }

    // Render recent click events
    if (!data.recentClicks || data.recentClicks.length === 0) {
      modalClicksTbody.innerHTML = '<tr><td colspan="3" class="empty-hint">No clicks recorded yet</td></tr>';
    } else {
      modalClicksTbody.innerHTML = data.recentClicks
        .map((c) => `
          <tr>
            <td>${new Date(c.clicked_at).toLocaleTimeString()}</td>
            <td>${c.referrer || 'Direct'}</td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.user_agent || ''}">
              ${c.user_agent ? c.user_agent.substring(0, 30) + '...' : 'Unknown'}
            </td>
          </tr>
        `)
        .join('');
    }

    statsModal.style.display = 'flex';
  } catch (err) {
    showToast('Error loading stats');
  }
};

// Close modal
closeModalBtn.addEventListener('click', () => {
  statsModal.style.display = 'none';
});

statsModal.addEventListener('click', (e) => {
  if (e.target === statsModal) {
    statsModal.style.display = 'none';
  }
});

// Initial boot
loadTelemetry();
loadRecentUrls();
setInterval(loadTelemetry, 8000);
