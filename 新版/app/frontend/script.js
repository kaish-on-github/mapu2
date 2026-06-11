// 儲存當前年份可見的廟宇資料
let places = []; 
let markers = []; 

// 設定外部 Wiki 的網域名稱 (目前先用佔位符，決定平台後可修改此處，例如 "https://zh.wikipedia.org/wiki")
const WIKI_DOMAIN = "https://your-wiki-domain.com";

// 初始化 Leaflet 地圖，中心點預設在臺北
const map = L.map("map").setView([25.0173, 121.5397], 15);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// 取得 HTML 元素
const sirCount = document.getElementById("sirCount");
const gongCount = document.getElementById("gongCount");
const meowCount = document.getElementById("meowCount");
const yearSlider = document.getElementById("yearSlider");
const yearText = document.getElementById("yearText");
const yearInput = document.getElementById("yearInput");
const viewAll = document.getElementById("viewAll");

// 根據後端回傳的資料更新地圖
async function updateMap(year) {
  try {
    // 向 Python 後端請求特定年份的資料
    const response = await fetch(`http://127.0.0.1:8000/api/temples?year=${year}`);
    places = await response.json(); // 取得篩選後的 JSON 陣列

    // 1. 清除舊的標記
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // 2. 計算各類型數量 (依據名稱包含關鍵字做彈性判斷)
    const sirTotal = places.filter(p => p.name.includes("神社")).length;
    const gongTotal = places.filter(p => p.name.includes("教堂") || p.name.includes("天主堂")).length;
    const meowTotal = places.length - sirTotal - gongTotal;

    sirCount.textContent = `神社數量：${sirTotal}`;
    gongCount.textContent = `教堂數量：${gongTotal}`;
    meowCount.textContent = `寺廟數量：${meowTotal}`;
  
    // 3. 在地圖上繪製新標記
    places.forEach(place => {
      // 判斷類型文字
      let typeText = "寺廟";
      if (place.name.includes("神社")) typeText = "神社";
      if (place.name.includes("教堂") || place.name.includes("天主堂")) typeText = "教堂";

      // 處理座標精度 (前端防呆保險：強制保留 6 位小數並轉回浮點數)
      const safeLat = parseFloat(Number(place.lat).toFixed(6));
      const safeLng = parseFloat(Number(place.lng).toFixed(6));

      // 處理圖片 HTML：加入多圖切換邏輯
      let imgHtml = "";
      
      if (place.images && place.images.length > 0) {
        if (place.images.length === 1) {
          // 只有一張圖時，維持簡單顯示
          imgHtml = `<img src="${place.images[0]}" class="popup-img" alt="${place.name}">`;
        } else {
          // 有多張圖片時，建立帶有左右按鈕的幻燈片
          const imagesJson = JSON.stringify(place.images).replace(/"/g, '&quot;');
          
          imgHtml = `
            <div class="popup-slider">
              <button class="slider-btn" onclick="window.changeImage(this, -1, '${imagesJson}')">◀</button>
              
              <div class="slider-img-container">
                <img src="${place.images[0]}" class="popup-img current-img" data-idx="0" alt="${place.name}">
                <div class="slider-indicator">1 / ${place.images.length}</div>
              </div>
              
              <button class="slider-btn" onclick="window.changeImage(this, 1, '${imagesJson}')">▶</button>
            </div>
          `;
        }
      } else {
        // 沒有圖片時顯示預設區塊
        imgHtml = `<div class="no-img">暫無圖片</div>`;
      }

      // 建立 Wiki 連結 (組合網域與該廟宇的 serial_no 編號)
      const wikiUrl = `${WIKI_DOMAIN}/${place.serial_no}`;
      // 建立標記與客製化彈窗
      const marker = L.marker([safeLat, safeLng])
        .addTo(map)
        .bindPopup(`
          <div class="custom-popup">
            <div class="popup-title">${place.name}</div>
            ${place.new_name ? `<div class="popup-subtitle">新名稱：${place.new_name}</div>` : ""}
            
            ${imgHtml}
            
            <div class="popup-info">
              <strong>類型：</strong>${typeText}<br>
              <strong>年代：</strong>${place.start_year} - ${place.end_year ?? "現在"}<br>
              <strong>地址：</strong>${place.address || "暫無資料"}<br>
              <hr class="popup-divider">
              <span class="popup-desc">${place.description || "無"}</span>
            </div>
            
            <div class="popup-link-container">
              <a href="${wikiUrl}" target="_blank" class="wiki-link">查看台灣廟宇wiki的頁面</a>
            </div>
          </div>
        `);

      markers.push(marker);
    });

  } catch (error) {
    console.error("無法從後端取得資料：", error);
  }
}

// 設定年份控制項
function setYear(year) {
  year = Number(year);
  if (year < 1895) year = 1895;
  if (year > 2026) year = 2026;

  yearSlider.value = year;
  yearInput.value = year;
  yearText.textContent = year;

  // 每次年份改變，就向後端重新撈取資料
  updateMap(year);
}

// 事件監聽：輸入框改變
yearInput.addEventListener("change", function () {
  setYear(yearInput.value);
});

// 事件監聽：拉桿滑動
yearSlider.addEventListener("input", function () {
  setYear(yearSlider.value);
});

// 事件監聽：顯示全部視角
viewAll.addEventListener("click", function () {
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds(), {
      padding: [50, 50]
    });
  }
});

// 網頁載入完成後，預設顯示 2026 年
window.addEventListener("DOMContentLoaded", () => {
  setYear(2026);
});

// 全域函式：處理彈窗內的圖片左右切換
window.changeImage = function(btn, direction, imagesJson) {
  // 將字串轉回陣列
  const images = JSON.parse(imagesJson);
  
  // 找到當前彈窗內的圖片容器與文字指示器
  const sliderContainer = btn.parentElement;
  const imgElement = sliderContainer.querySelector('.current-img');
  const indicator = sliderContainer.querySelector('.slider-indicator');

  // 取得現在正在顯示第幾張 (Index)
  let currentIdx = parseInt(imgElement.getAttribute('data-idx'));
  
  // 計算下一張的 Index
  let nextIdx = currentIdx + direction;

  // 無限循環邏輯
  if (nextIdx < 0) nextIdx = images.length - 1;
  if (nextIdx >= images.length) nextIdx = 0;

  // 更新圖片的網址、屬性與右下角的數字
  imgElement.src = images[nextIdx];
  imgElement.setAttribute('data-idx', nextIdx);
  indicator.textContent = `${nextIdx + 1} / ${images.length}`;
};