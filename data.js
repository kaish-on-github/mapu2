/**
 * data.js — 從後端 API 載入景點資料
 *
 * 資料來源：http://127.0.0.1:8000/api/temples
 * 不再使用 spots.csv，欄位由後端回傳。
 */

let SPOTS = [];
let _spotsReady;
const spotsReady = new Promise((resolve) => { _spotsReady = resolve; });

function mapTempleToSpot(t) {
  const address = t.address || '';
  const cityMatch = address.match(/^(.{2,3}[縣市])/);
  const city = cityMatch ? cityMatch[1] : address.slice(0, 3);

  return {
    id:          t.id,
    serial_no:   t.serial_no,
    name:        t.name,
    new_name:    t.new_name || '',
    city,
    emoji:       '⛩️',
    image:       (t.images && t.images.length > 0) ? t.images[0] : null,
    images:      t.images || [],
    lat:         t.lat,
    lng:         t.lng,
    radius:      50,
    period:      `${t.start_year ?? '?'}–${t.end_year ?? '現在'}`,
    description: t.description || '',
  };
}

fetch('http://127.0.0.1:8000/api/temples')
  .then(res => {
    if (!res.ok) throw new Error(`API 回應錯誤（${res.status}）`);
    return res.json();
  })
  .then(data => {
    SPOTS = data
      .map(mapTempleToSpot)
      .filter(s => !isNaN(s.lat) && !isNaN(s.lng));
    _spotsReady(SPOTS);
  })
  .catch(err => {
    console.error('資料載入失敗：', err);
    document.body.innerHTML =
      `<div style="padding:2rem;font-family:sans-serif;color:#B22222;">
         <strong>⚠️ 無法載入景點資料</strong><br>
         請確認後端伺服器正在執行中（<code>uvicorn main:app --reload</code>）。<br><br>
         錯誤訊息：${err.message}
       </div>`;
  });
