/**
 * data.js — 從 spots.csv 載入景點資料
 *
 * ✅ 只需編輯 spots.csv，不需改動此檔或 app.js。
 * ✅ 部署到 GitHub Pages 後直接可用。
 *
 * 欄位：編號, 名稱, 新名稱, 地址, 緯度, 經度, 開始年分, 結束年分, 說明
 *
 * 若要指定章的圖片，在下方 IMAGE_MAP 填入路徑：
 *   IMAGE_MAP[101] = "images/101_稻荷神社.jpg";
 */

/* 圖片對應表，key 為編號數字 */
const IMAGE_MAP = {};

/* -----------------------------------------------
   以下不需修改
   ----------------------------------------------- */

let SPOTS = [];
let _spotsReady;
const spotsReady = new Promise((resolve) => { _spotsReady = resolve; });

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');

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

    return {
      id,
      name:        get('名稱'),
      city,
      emoji:       '⛩️',
      image:       IMAGE_MAP[id] || null,
      lat:         parseFloat(get('緯度')),
      lng:         parseFloat(get('經度')),
      radius:      50,
      period:      `${get('開始年分')}–${get('結束年分')}`,
      description: get('說明'),
    };
  }).filter(s => !isNaN(s.id) && !isNaN(s.lat));
}

fetch('spots.csv')
  .then(res => {
    if (!res.ok) throw new Error(`無法讀取 spots.csv（${res.status}）`);
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
         請確認 <code>spots.csv</code> 和 <code>index.html</code> 放在同一個資料夾。<br><br>
         錯誤訊息：${err.message}
       </div>`;
  });
