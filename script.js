// ------------------------------------------------------
// INITIALIZE MAP
// ------------------------------------------------------
const map = L.map('map').setView([48.5, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 10,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Layers
let territorialLayer;
let alertsLayer;
let explosionsLayer;


// ------------------------------------------------------
// LOAD TERRITORIAL CONTROL (LOCAL GEOJSON FILES)
// ------------------------------------------------------
async function loadTerritorial() {
  try {
    const occupied = await fetch('data/occupied.geojson').then(r => r.json());
    const liberated = await fetch('data/liberated.geojson').then(r => r.json());
    const contested = await fetch('data/contested.geojson').then(r => r.json());
    const frontline = await fetch('data/frontline.geojson').then(r => r.json());

    if (territorialLayer) map.removeLayer(territorialLayer);

    territorialLayer = L.layerGroup([
      // Frontline line
      L.geoJSON(frontline, {
        style: {
          color: "#000",
          weight: 2,
          fillOpacity: 0
        }
      }),

      // Occupied areas
      L.geoJSON(occupied, {
        style: {
          fillColor: "#d73027",
          color: "#333",
          weight: 1,
          fillOpacity: 0.6
        }
      }),

      // Liberated areas
      L.geoJSON(liberated, {
        style: {
          fillColor: "#1a9850",
          color: "#333",
          weight: 1,
          fillOpacity: 0.6
        }
      }),

      // Contested areas
      L.geoJSON(contested, {
        style: {
          fillColor: "#fdae61",
          color: "#333",
          weight: 1,
          fillOpacity: 0.6
        }
      })
    ]).addTo(map);

  } catch (err) {
    console.error("Territorial load error:", err);
  }
}


// ------------------------------------------------------
// LOAD AIR ALERTS (Ukraine Alarm API)
// ------------------------------------------------------
async function loadAlerts() {
  try {
    const res = await fetch("https://api.ukrainealarm.com/api/v3/alerts");
    const data = await res.json();

    const features = data.map(alert => ({
      type: "Feature",
      properties: {
        region: alert.region,
        type: alert.alertType
      },
      geometry: {
        type: "Polygon",
        coordinates: alert.polygon
      }
    }));

    if (alertsLayer) map.removeLayer(alertsLayer);

    alertsLayer = L.geoJSON({ type: "FeatureCollection", features }, {
      style: f => ({
        color:
          f.properties.type === "missile" ? "red" :
          f.properties.type === "drone" ? "orange" :
          "yellow",
        weight: 2,
        fillOpacity: 0.25
      }),
      onEachFeature: (f, layer) => {
        layer.bindPopup(`<b>${f.properties.region}</b><br>Alert: ${f.properties.type}`);
      }
    }).addTo(map);

  } catch (err) {
    console.error("Alert load error:", err);
  }
}


// ------------------------------------------------------
// LOAD EXPLOSIONS (LiveUAmap feed)
// ------------------------------------------------------
async function loadExplosions() {
  try {
    const res = await fetch("https://liveuamap.com/events.json");
    const data = await res.json();

    const features = data.events.map(ev => ({
      type: "Feature",
      properties: {
        type: ev.type,
        desc: ev.title,
        time: ev.time
      },
      geometry: {
        type: "Point",
        coordinates: [ev.lng, ev.lat]
      }
    }));

    if (explosionsLayer) map.removeLayer(explosionsLayer);

    const explosionIcon = L.divIcon({
      html: '<span style="color:red;font-size:20px;">✹</span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    explosionsLayer = L.geoJSON({ type: "FeatureCollection", features }, {
      pointToLayer: (f, latlng) => L.marker(latlng, { icon: explosionIcon }),
      onEachFeature: (f, layer) => {
        layer.bindPopup(
          `<b>${f.properties.type}</b><br>${f.properties.time}<br>${f.properties.desc}`
        );
      }
    }).addTo(map);

  } catch (err) {
    console.error("Explosion load error:", err);
  }
}


// ------------------------------------------------------
// REFRESH ALL LAYERS
// ------------------------------------------------------
async function refresh() {
  await loadTerritorial();
  await loadAlerts();
  await loadExplosions();
}

refresh();
setInterval(refresh, 30000); // update every 30 seconds
