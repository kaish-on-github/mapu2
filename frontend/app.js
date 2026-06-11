/**
 * app.js — 集章圖鑑主程式
 *
 * 功能：
 *   - 圖鑑展示（鎖定 / 解鎖狀態）
 *   - GPS 打卡（Haversine 距離判定）
 *   - 已集章記錄存入 localStorage
 *   - Modal 詳細資訊
 */

/* ==========================================
   常數
   ========================================== */

const STORAGE_KEY = 'temple_stamps_collected';

/* ==========================================
   狀態
   ========================================== */

/** @type {Set<number>} 已收集的景點 ID */
let collected = loadCollected();

/** @type {number|null} 目前 GPS 緯度 */
let currentLat = null;

/** @type {number|null} 目前 GPS 經度 */
let currentLng = null;

/* ==========================================
   localStorage 讀寫
   ========================================== */

/**
 * 從 localStorage 讀取已集章 ID，回傳 Set
 * @returns {Set<number>}
 */
function loadCollected() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(Number) : []);
  } catch {
    return new Set();
  }
}

/**
 * 將已集章 ID 寫入 localStorage
 */
function saveCollected() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collected]));
  } catch (e) {
    console.warn('localStorage 寫入失敗', e);
  }
}

/* ==========================================
   工具函式
   ========================================== */

/**
 * Haversine 公式計算兩點地面距離（公尺）
 */
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

/**
 * 找出距離目前位置最近的景點
 * @returns {{ spot: object, dist: number }}
 */
function findNearest(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of SPOTS) {
    const d = haversine(lat, lng, spot.lat, spot.lng);
    if (d < bestDist) {
      bestDist = d;
      best = spot;
    }
  }
  return { spot: best, dist: bestDist };
}

/**
 * 建立章的圖片元素（img 或 emoji fallback）
 * @param {object} spot
 * @param {boolean} locked  - 是否灰階鎖定
 * @returns {string} HTML string
 */
function buildImgHTML(spot, locked) {
  const lockClass = locked ? 'locked' : 'collected';
  if (spot.image) {
    return `<div class="stamp-img-wrap ${lockClass}">
               <img src="${spot.image}" alt="${spot.name}的章" loading="lazy" />
             </div>`;
  }
  return `<div class="stamp-img-wrap ${lockClass}">
             <span class="stamp-emoji" aria-hidden="true">${spot.emoji}</span>
           </div>`;
}

/* ==========================================
   渲染：圖鑑頁
   ========================================== */

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  for (const spot of SPOTS) {
    const ok = collected.has(spot.id);
    const card = document.createElement('div');
    card.className = `stamp-card${ok ? ' is-collected' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${spot.name}，${ok ? '已集章' : '尚未集章'}`);
    card.innerHTML = `
      <div class="stamp-badge ${ok ? 'badge-collected' : 'badge-locked'}" aria-hidden="true">
        ${ok ? '✓' : '🔒'}
      </div>
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
  grid.innerHTML = '';

  const list = SPOTS.filter((s) => collected.has(s.id));

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
    card.setAttribute('aria-label', spot.name);
    card.innerHTML = `
      ${buildImgHTML(spot, false)}
      <div class="stamp-name">${spot.name}</div>
      <div class="stamp-city">${spot.city}</div>
    `;
    card.addEventListener('click', () => openModal(spot));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openModal(spot);
    });
    grid.appendChild(card);
  }
}

/* ==========================================
   進度條
   ========================================== */

function updateProgress() {
  const n = collected.size;
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
  // 更新按鈕狀態
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 切換 section
  document.querySelectorAll('.section').forEach((sec) => {
    sec.classList.remove('active');
  });
  document.getElementById('tab-' + tabName).classList.add('active');

  // 切到已集章時才重繪（避免每次都跑）
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
      currentLat = pos.coords.latitude;
      currentLng = pos.coords.longitude;

      document.getElementById('lat-val').textContent = currentLat.toFixed(5);
      document.getElementById('lng-val').textContent = currentLng.toFixed(5);
      dot.className = 'status-dot active';
      txt.textContent = '定位成功';
      btn.disabled = false;

      processCheckIn(currentLat, currentLng);
    },
    (err) => {
      showGpsError('無法取得位置：' + err.message);
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

function processCheckIn(lat, lng) {
  const { spot, dist } = findNearest(lat, lng);

  // 顯示最近景點
  const nearestBox = document.getElementById('nearest-box');
  nearestBox.style.display = 'block';
  document.getElementById('nearest-name').textContent = spot.name + ' ' + spot.emoji;
  document.getElementById('nearest-dist').textContent = '距離 ' + Math.round(dist) + ' 公尺';

  // 判定結果
  const banner = document.getElementById('result-banner');
  banner.style.display = 'block';

  if (dist <= spot.radius) {
    if (collected.has(spot.id)) {
      banner.className = 'result-banner result-already';
      banner.textContent = '你已經集過「' + spot.name + '」的章囉！';
    } else {
      collected.add(spot.id);
      saveCollected();
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
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  dot.className = 'status-dot error';
  txt.textContent = msg;
}

/* ==========================================
   Modal
   ========================================== */

function openModal(spot) {
  const ok = collected.has(spot.id);

  // 圖片
  const imgEl = document.getElementById('modal-img');
  if (spot.image) {
    imgEl.innerHTML = `<img src="${spot.image}" alt="${spot.name}的章" style="${ok ? '' : 'filter:grayscale(1);opacity:.5'}" />`;
  } else {
    imgEl.style.filter = ok ? '' : 'grayscale(1) opacity(.5)';
    imgEl.innerHTML = `<span aria-hidden="true">${spot.emoji}</span>`;
  }

  document.getElementById('modal-title').textContent = spot.name;
  document.getElementById('modal-sub').textContent =
    spot.city + '｜打卡半徑 ' + spot.radius + ' 公尺';

  const periodEl = document.getElementById('modal-period');
  periodEl.textContent = spot.period ? '📅 ' + spot.period : '';

  const statusEl = document.getElementById('modal-status');
  statusEl.textContent = ok ? '✓ 已集章' : '尚未集章';
  statusEl.className = 'modal-status ' + (ok ? 'collected' : 'not-collected');

  const descEl = document.getElementById('modal-desc');
  descEl.textContent = spot.description || '';

  document.getElementById('modal').classList.add('open');
  document.getElementById('modal').focus();
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// ESC 鍵關閉 Modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ==========================================
   初始化 — 等待 CSV 載入完成後才渲染
   ========================================== */

spotsReady.then(() => {
  document.getElementById('prog-bar-aria').setAttribute('aria-valuemax', SPOTS.length);
  renderGallery();
});
