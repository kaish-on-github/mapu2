/**
 * data.js — 從 temple.csv 載入景點資料
 * 欄位：編號, 名稱, 新名稱, 地址, 緯度, 經度, 開始年分, 結束年分, 說明
 */

let SPOTS = [];
let _spotsReady;
const spotsReady = new Promise((resolve) => { _spotsReady = resolve; });

function getCategoryById(id) {
  if ((id >= 101 && id <= 108) || (id >= 201 && id <= 212)) return "鄉社";
  if ((id >= 109 && id <= 112) || id === 301) return "官社";
  if (id >= 302 && id <= 312) return "縣社";
  return "未分類";
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const get = (key) => {
      const i = headers.indexOf(key);
      if (key === '說明') return cols.slice(i).join(',').trim();
      return (cols[i] || '').trim();
    };

    const id = parseInt(get('編號'), 10);
    const address = get('地址');
    const cityMatch = address.match(/^(.{2,3}[縣市])/);
    const city = cityMatch ? cityMatch[1] : address.slice(0, 3);
    const category = getCategoryById(id);

    return {
      id,
      serial_no:   String(id),
      name:        get('名稱'),
      new_name:    get('新名稱'),
      city,
      category,
      emoji:       '⛩️',
      image:       `images/${id}1.jpeg`,   // 預設顯示過去圖
      imagePast:   `images/${id}1.jpeg`,   // 過去
      imageNow:    `images/${id}2.jpeg`,   // 現在
      lat:         parseFloat(get('緯度')),
      lng:         parseFloat(get('經度')),
      radius:      50,
      period:      `${get('開始年分')}–${get('結束年分') || '現在'}`,
      description: get('說明'),
    };
  }).filter(s => !isNaN(s.id) && !isNaN(s.lat));
}

fetch('temple.csv')
  .then(res => {
    if (!res.ok) throw new Error(`無法讀取 temple.csv（${res.status}）`);
    return res.text();
  })
  .then(text => {
    SPOTS = parseCSV(text);
    _spotsReady(SPOTS);
  })
  .catch(err => {
    console.error('CSV 載入失敗：', err);
    document.body.innerHTML =
      `<div style="padding:2rem;font-family:sans-serif;color:#B22222;">
         <strong>⚠️ 無法載入景點資料</strong><br>
         請確認 <code>temple.csv</code> 和 <code>card.html</code> 放在同一個資料夾。<br><br>
         錯誤訊息：${err.message}
       </div>`;
  });
