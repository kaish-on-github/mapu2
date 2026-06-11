// 儲存當前年份可見的廟宇資料
let places = []; 
let markers = []; 

const map = L.map("map").setView([25.0173, 121.5397], 15);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// 取得 HTML 元素
const xiangCount = document.getElementById("xiangCount");
const guanCount = document.getElementById("guanCount");
const xianCount = document.getElementById("xianCount");

const showXiang = document.getElementById("showXiang");
const showGuan = document.getElementById("showGuan");
const showXian = document.getElementById("showXian");

const viewAll = document.getElementById("viewAll");

// 讀取 CSV

async function loadCSV() {
  const response = await fetch("temple.csv");
  const text = await response.text();
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",").map(h => h.trim());

  places = rows.slice(1).map(row => {
    const values = row.split(",");
    const place = {};

    headers.forEach((header, index) => {
      place[header] = values[index]?.trim();
    });

    place.id = Number(place.id || place.編號);
    place.lat = Number(place.lat || place.緯度);
    place.lng = Number(place.lng || place.經度);
    place.category = getCategoryById(place.id);

    return place;
  });
}

// 用編號判斷分類

function getCategoryById(id) {
  if ((id >= 101 && id <= 108) || (id >= 201 && id <= 212)) {
    return "鄉社";
  }

  if (id >= 109 && id <= 112) {
    return "官社";
  }

  if (id >= 301 && id <= 312) {
    return "縣社";
  }

  return "未分類";
}

// 更新統計

function updateCounts() {
  const xiangTotal = places.filter(place => place.category === "鄉社").length;
  const guanTotal = places.filter(place => place.category === "官社").length;
  const xianTotal = places.filter(place => place.category === "縣社").length;

  xiangCount.textContent = `鄉社：${xiangTotal}`;
  guanCount.textContent = `官社：${guanTotal}`;
  xianCount.textContent = `縣社：${xianTotal}`;
}

// 顯示地圖標記

function renderMap(targetPlaces) {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  targetPlaces.forEach(place => {
    if (!place.lat || !place.lng) return;
    const marker = L.marker([place.lat, place.lng])
      .addTo(map)
      .bindPopup(`
        <div class="place-popup">
          <h3>${place.名稱}</h3>

          <div class="photo-tabs">
            <button onclick="showPhoto('${place.編號}', 'past', '${place.名稱}', '${place.新名稱}')">
              過去
            </button>
            <button onclick="showPhoto('${place.編號}', 'now', '${place.名稱}', '${place.新名稱}')">
              現在
            </button>
          </div>

          <div class="photo-area">
            <div id="photo-title-${place.編號}" class="photo-title">
              ${place.名稱}
            </div>

            <img
              id="photo-img-${place.編號}"
              src="images/${place.編號}1.jpg"
              alt="${place.名稱}"
              class="popup-photo"
            >
          </div>

          <div class="popup-info">
            <p><strong>地址：</strong>${place.地址 || "暫無資料"}</p>
            <p><strong>開始年份：</strong>${place.開始年分 || "不詳"}</p>
            <p><strong>結束年份：</strong>${place.結束年分 || "不詳"}</p>
            <p><strong>說明：</strong>${place.說明 || "暫無說明"}</p>
          </div>
        </div>

      `);

    markers.push(marker);
  });

}

// 顯示特定分類

function showCategory(category) {
  const filteredPlaces = places.filter(
    place => place.category === category
  );

  renderMap(filteredPlaces);

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds(), {
      padding: [50, 50]
    });
  }
}

// 顯示全部

function showAllPlaces() {
  renderMap(places);
}

// 顯示全部並自動縮放

function fitAllMarkers() {
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds(), {
      padding: [50, 50]
    });
  }
}

// 按鈕事件

showXiang.addEventListener("click", function () {
  showCategory("鄉社");
});

showGuan.addEventListener("click", function () {
  showCategory("官社");
});

showXian.addEventListener("click", function () {
  showCategory("縣社");
});

viewAll.addEventListener("click", function () {
  showAllPlaces();
  fitAllMarkers();
});

// 網頁載入後讀 temple.csv

window.addEventListener("DOMContentLoaded", async () => {
  await loadCSV();
  updateCounts();
  showAllPlaces();
});

function showPhoto(id, mode, oldName, newName) {
  const img = document.getElementById(`photo-img-${id}`);
  const title = document.getElementById(`photo-title-${id}`);
  if (mode === "past") {
    img.src = `images/${id}1.jpg`;
    img.alt = oldName;
    title.textContent = oldName;
  }

  if (mode === "now") {
    img.src = `images/${id}2.jpg`;
    img.alt = newName;
    title.textContent = newName;
  }
}


// 根據後端回傳的資料更新地圖
/*
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
    const xiangTotal = places.filter(p =>
    `${p.name} ${p.type || ""} ${p.description || ""}`.includes("鄉社")
    ).length;
  
    const xianTotal = places.filter(p =>
    `${p.name} ${p.type || ""} ${p.description || ""}`.includes("縣社")
    ).length;

    xiangCount.textContent = `鄉社：${xiangTotal}`;

    xianCount.textContent = `縣社：${xianTotal}`;
  
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

// 事件監聽

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
  updateMap(2026);
});
*/