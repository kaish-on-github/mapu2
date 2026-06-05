let places = [];

async function loadCSV() {
  const response = await fetch("temple.csv");
  const text = await response.text();

  const rows = text.trim().split("\n");
  const headers = rows[0].split(",");

  places = rows.slice(1).map(row => {
    const values = row.split(",");

    return {
      name: values[0],
      type: values[1],
      lat: Number(values[2]),
      lng: Number(values[3]),
      startYear: Number(values[4]),
      endYear: values[5] === "" ? null : Number(values[5]),
      description: values[6]
    };
  });
}

const map = L.map("map").setView([25.0173, 121.5397], 15);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

// 地點標記

let markers = []; 

function existsInYear(place, year) {
  const started = place.startYear <= year;
  const notEnded = place.endYear === null || place.endYear >= year;
  return started && notEnded;
}

// 數數

const sirCount = document.getElementById("sirCount");
const gongCount = document.getElementById("gongCount");
const meowCount = document.getElementById("meowCount");

function updateMap(year) {
  markers.forEach(marker => {
    map.removeLayer(marker);
  });

  markers = [];

  const visiblePlaces = places.filter(place => existsInYear(place, year));
  const sirTotal = visiblePlaces.filter(place => place.type === "神社").length;
  const gongTotal = visiblePlaces.filter(place => place.type === "教堂").length;
  const meowTotal = visiblePlaces.filter(place => place.type === "寺廟").length;

  sirCount.textContent = `神社數量：${sirTotal}`;
  gongCount.textContent = `教堂數量：${gongTotal}`;
  meowCount.textContent = `寺廟數量：${meowTotal}`;
  
  visiblePlaces.forEach(place => {
    const marker = L.marker([place.lat, place.lng])
      .addTo(map)
      .bindPopup(`
        <strong>${place.name}</strong><br>
        類型：${place.type}<br>
        年代：${place.startYear} - ${place.endYear ?? "現在"}<br>
        ${place.description}
      `);

    markers.push(marker);
  });

}

// 設定年代

const yearSlider = document.getElementById("yearSlider");
const yearText = document.getElementById("yearText");
const yearInput = document.getElementById("yearInput");

function setYear(year) {
  year = Number(year);
  if (year < 1701) {
    year = 1701;
  }
  if (year > 2026) {
    year = 2026;
  }

  yearSlider.value = year;
  yearInput.value = year;
  yearText.textContent = year;

  updateMap(year);
}

yearInput.addEventListener("change", function () {
  setYear(yearInput.value);
});

yearSlider.addEventListener("input", function () {
  setYear(yearSlider.value);
});

loadCSV().then(() => {
  setYear(2026);
});

const viewAll= document.getElementById("viewAll");

viewAll.addEventListener("click", function () {
  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds(), {
      padding: [50, 50]
    });
  }
});