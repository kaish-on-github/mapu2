/**
 * app.js — 集章圖鑑主程式（Firebase 版）
 * 功能：分類篩選、過去/現在圖片切換、GPS打卡、Firestore記錄
 */

if (!window.collected) window.collected = new Set();

let currentFilter = 'all'; // 'all' | '官社' | '縣社' | '鄉社'

/* ==========================================
   工具函式
   ========================================== */

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearest(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const spot of SPOTS) {
    const d = haversine(lat, lng, spot.lat, spot.lng);
    if (d < bestDist) { bestDist = d; best = spot; }
  }
  return { spot: best, dist: bestDist };
}

function buildImgHTML(spot, locked) {
  const lockClass = locked ? 'locked' : 'collected';
  return `<div class="stamp-img-wrap ${lockClass}">
    <img src="${spot.imagePast}" alt="${spot.name}" loading="lazy"
         onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'stamp-emoji\\'>${spot.emoji}</span>'" />
  </div>`;
}

/* ==========================================
   分類篩選
   ========================================== */

function setFilter(filter) {
  currentFilter = filter;

  // 更新按鈕狀態
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderGallery();
}

function getFilteredSpots() {
  if (currentFilter === 'all') return SPOTS;
  return SPOTS.filter(s => s.category === currentFilter);
}

/* ==========================================
   渲染：圖鑑頁
   ========================================== */

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const spots = getFilteredSpots();

  if (spots.length === 0) {
    grid.innerHTML = `<div class="empty-hint" style="grid-column:1/-1">
      <span class="empty-icon">🔍</span><p>此分類沒有資料</p>
    </div>`;
    return;
  }

  for (const spot of spots) {
    const ok = window.collected.has(spot.id);
    const card = document.createElement('div');
    card.className = `stamp-card${ok ? ' is-collected' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${spot.name}，${ok ? '已集章' : '尚未集章'}`);
    card.innerHTML = `
      <div class="stamp-badge ${ok ? 'badge-collected' : 'badge-locked'}" aria-hidden="true">
        ${ok ? '✓' : '🔒'}
      </div>
      <div class="stamp-category-tag">${spot.category}</div>
      ${buildImgHTML(spot, !ok)}
      <div class="stamp-name">${spot.name}</div>
      <div class="stamp-city">${spot.city}</div>
    `;
    card.addEventListener('click', () => openModal(spot));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openModal(spot);
    });
    grid.appendChild(card);
  }

  updateProgress();
}

/* ==========================================
   渲染：已集章頁
   ========================================== */

function renderCollected() {
  const grid = document.getElementById('collected-grid');
  const empty = document.getElementById('collected-empty');
  if (!grid) return;
  grid.innerHTML = '';

  const list = SPOTS.filter((s) => window.collected.has(s.id));

  if (list.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  for (const spot of list) {
    const card = document.createElement('div');
    card.className = 'stamp-card is-collected';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="stamp-category-tag">${spot.category}</div>
      ${buildImgHTML(spot, false)}
      <div class="stamp-name">${spot.name}</div>
      <div class="stamp-city">${spot.city}</div>
    `;
    card.addEventListener('click', () => openModal(spot));
    grid.appendChild(card);
  }
}

/* ==========================================
   進度條
   ========================================== */

function updateProgress() {
  const n = window.collected.size;
  const total = SPOTS.length;
  const pct = total > 0 ? (n / total) * 100 : 0;

  document.getElementById('prog-count').textContent = n;
  document.getElementById('prog-total').textContent = total;
  document.getElementById('prog-bar').style.width = pct.toFixed(1) + '%';

  const aria = document.getElementById('prog-bar-aria');
  aria.setAttribute('aria-valuenow', n);
  aria.setAttribute('aria-valuemax', total);
}

/* ==========================================
   分頁切換
   ========================================== */

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.section').forEach((sec) => {
    sec.classList.remove('active');
  });
  document.getElementById('tab-' + tabName).classList.add('active');
  if (tabName === 'collected') renderCollected();
}

/* ==========================================
   GPS 打卡
   ========================================== */

function checkLocation() {
  if (!navigator.geolocation) {
    showGpsError('此瀏覽器不支援 GPS 定位');
    return;
  }

  const btn = document.getElementById('check-btn');
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');

  btn.disabled = true;
  dot.className = 'status-dot active';
  txt.textContent = '定位中…';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      document.getElementById('lat-val').textContent = lat.toFixed(5);
      document.getElementById('lng-val').textContent = lng.toFixed(5);
      dot.className = 'status-dot active';
      txt.textContent = '定位成功';
      btn.disabled = false;

      processCheckIn(lat, lng);
    },
    (err) => {
      showGpsError('無法取得位置：' + err.message);
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

async function processCheckIn(lat, lng) {
  const { spot, dist } = findNearest(lat, lng);

  const nearestBox = document.getElementById('nearest-box');
  nearestBox.style.display = 'block';
  document.getElementById('nearest-name').textContent = spot.name + ' ' + spot.emoji;
  document.getElementById('nearest-dist').textContent = '距離 ' + Math.round(dist) + ' 公尺';

  const banner = document.getElementById('result-banner');
  banner.style.display = 'block';

  if (dist <= spot.radius) {
    if (window.collected.has(spot.id)) {
      banner.className = 'result-banner result-already';
      banner.textContent = '你已經集過「' + spot.name + '」的章囉！';
    } else {
      window.collected.add(spot.id);
      if (window.saveCollected) await window.saveCollected();
      renderGallery();
      banner.className = 'result-banner result-success';
      banner.textContent = '🎉 恭喜！成功集到「' + spot.name + '」的章！';
    }
  } else {
    banner.className = 'result-banner result-fail';
    banner.textContent =
      '距離「' + spot.name + '」還有 ' + Math.round(dist) + ' 公尺，再靠近一點（需在 ' + spot.radius + ' 公尺內）';
  }
}

function showGpsError(msg) {
  document.getElementById('status-dot').className = 'status-dot error';
  document.getElementById('status-text').textContent = msg;
}

/* ==========================================
   Modal（含過去/現在圖片切換）
   ========================================== */

let currentModalSpot = null;
let currentPhotoMode = 'past'; // 'past' | 'now'

function openModal(spot) {
  currentModalSpot = spot;
  currentPhotoMode = 'past';

  const ok = window.collected.has(spot.id);

  document.getElementById('modal-title').textContent = spot.name;
  document.getElementById('modal-new-name').textContent = spot.new_name ? `現名：${spot.new_name}` : '';
  document.getElementById('modal-sub').textContent = spot.city + '　' + spot.category + '｜打卡半徑 ' + spot.radius + ' 公尺';
  document.getElementById('modal-period').textContent = spot.period ? '📅 ' + spot.period : '';
  document.getElementById('modal-desc').textContent = spot.description || '';

  const statusEl = document.getElementById('modal-status');
  statusEl.textContent = ok ? '✓ 已集章' : '尚未集章';
  statusEl.className = 'modal-status ' + (ok ? 'collected' : 'not-collected');

  // 圖片切換按鈕：只有已集章才能看現在圖片
  const photoTabs = document.getElementById('modal-photo-tabs');
  photoTabs.style.display = ok ? 'flex' : 'none';

  // 預設顯示過去圖片
  showModalPhoto('past');

  document.getElementById('modal').classList.add('open');
}

function showModalPhoto(mode) {
  if (!currentModalSpot) return;
  currentPhotoMode = mode;

  const spot = currentModalSpot;
  const ok = window.collected.has(spot.id);
  const src = mode === 'past' ? spot.imagePast : spot.imageNow;
  const label = mode === 'past' ? spot.name : (spot.new_name || spot.name);

  const imgEl = document.getElementById('modal-img');
  imgEl.innerHTML = `
    <img src="${src}" alt="${label}"
         style="${(!ok) ? 'filter:grayscale(1);opacity:.5' : ''}"
         onerror="this.parentElement.innerHTML='<span style=\\'font-size:42px\\'>${spot.emoji}</span>'" />
  `;

  document.getElementById('modal-photo-label').textContent = mode === 'past' ? `過去・${spot.name}` : `現在・${label}`;

  // 更新按鈕 active 狀態
  document.querySelectorAll('.photo-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  currentModalSpot = null;
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
