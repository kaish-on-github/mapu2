// 儲存當前年份可見的廟宇資料
let places = []; 
let markers = []; 

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

    // 2. 計算各類型數量
    // 註：若新資料庫無明確的 type 欄位，此處依據名稱包含關鍵字做彈性判斷
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

      const marker = L.marker([place.lat, place.lng])
        .addTo(map)
        .bindPopup(`
          <strong>${place.name}</strong><br>
          ${place.new_name ? `新名稱：${place.new_name}<br>` : ""}
          類型：${typeText}<br>
          地址：${place.address || "暫無資料"}<br>
          年代：${place.start_year} - ${place.end_year ?? "現在"}<br>
          說明：${place.description || "無"}
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
  if (year < 1701) year = 1701;
  if (year > 2026) year = 2026;

  yearSlider.value = year;
  yearInput.value = year;
  yearText.textContent = year;

  // 每次年份改變，就向後端重新撈取資料
  updateMap(year);
}

// 事件監聽
yearInput.addEventListener("change", function () {
  setYear(yearInput.value);
});

yearSlider.addEventListener("input", function () {
  setYear(yearSlider.value);
});

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
