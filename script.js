// -----------------------------
// INITIALIZE MAP
// -----------------------------
const map = L.map('map').setView([48.5, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 10,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Layers
let territorialLayer;
let alertsLayer;
let explosionsLayer;


// -----------------------------
// LOAD TERRITORIAL CONTROL (DeepStateMap API)
// -----------------------------
// DeepStateMap has an unofficial API that returns polygons.
// We convert them into GeoJSON and display them.

async function loadTerritorial() {
  try {
    const frontline = await fetch("https://deepstatemap.live/api/frontline").then(r => r.json());
    const occupied = await fetch("https://deepstatemap.live/api/occupied").then(r => r.json());
    const liberated = await fetch("https://deepstatemap.live/api/liberated").then(r => r.json());

    // Convert DeepStateMap format → GeoJSON
    function convert(ds) {
      return {
        type: "FeatureCollection",
        features: ds.map(item => ({
          type: "Feature",
          properties: { status: item.status || "unknown" },
          geometry: {
            type: "Polygon",
            coordinates: item.coords
          }
        }))
      };
    }

    const frontlineGeo = convert(frontline);
    const occupiedGeo = convert(occupied);
    const liberatedGeo = convert(liberated);

    if (territorialLayer) map.removeLayer(territorialLayer);

    territorialLayer = L.layerGroup([
      L.geoJSON(frontlineGeo, {
        style: { color: "#000", weight: 2, fillOpacity: 0 }
      }),
      L.geoJSON(occupiedGeo, {
        style: { fillColor: "#d73027", color: "#333", weight: 1, fillOpacity: 0.6 }
      }),
      L.geoJSON(liberatedGeo, {
        style: { fillColor: "#1a9850", color: "#333", weight: 1, fillOpacity: 0.6 }
      })
    ]).addTo(map);

  } catch (err) {
    console.error("Territorial load error:", err);
  }
}


// -----------------------------
// LOAD AIR ALERTS (Ukraine Alarm API)
// -----------------------------
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


// -----------------------------
// LOAD EXPLOSIONS (LiveUAmap feed)
// -----------------------------
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


// -----------------------------
// REFRESH ALL LAYERS
// -----------------------------
async function refresh() {
  await loadTerritorial();
  await loadAlerts();
  await loadExplosions();
}

refresh();
setInterval(refresh, 30000); // update every 30 seconds
