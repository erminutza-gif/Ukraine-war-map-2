// Initialize map
const map = L.map('map').setView([48.5, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 10,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Layers
let territorialLayer;
let alertsLayer;
let explosionsLayer;

// Load territorial control (static file)
async function loadTerritorial() {
  const res = await fetch('data/territorial.json');
  const geo = await res.json();

  if (territorialLayer) map.removeLayer(territorialLayer);

  territorialLayer = L.geoJSON(geo, {
    style: f => ({
      color: '#333',
      weight: 1,
      fillColor:
        f.properties.status === 'occupied'
          ? '#d73027'
          : f.properties.status === 'liberated'
          ? '#1a9850'
          : '#fdae61',
      fillOpacity: 0.6
    })
  }).addTo(map);
}

// Load air alerts (live)
async function loadAlerts() {
  const res = await fetch('https://api.ukrainealarm.com/api/v3/alerts');
  const data = await res.json();

  const features = data.map(alert => ({
    type: 'Feature',
    properties: {
      region: alert.region,
      type: alert.alertType
    },
    geometry: {
      type: 'Polygon',
      coordinates: alert.polygon
    }
  }));

  if (alertsLayer) map.removeLayer(alertsLayer);

  alertsLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: f => ({
      color:
        f.properties.type === 'missile'
          ? 'red'
          : f.properties.type === 'drone'
          ? 'orange'
          : 'green',
      weight: 2,
      fillOpacity: 0.25
    })
  }).addTo(map);
}

// Load explosions (live)
async function loadExplosions() {
  const res = await fetch('https://liveuamap.com/events.json');
  const data = await res.json();

  const features = data.events.map(ev => ({
    type: 'Feature',
    properties: {
      type: ev.type,
      desc: ev.title,
      time: ev.time
    },
    geometry: {
      type: 'Point',
      coordinates: [ev.lng, ev.lat]
    }
  }));

  if (explosionsLayer) map.removeLayer(explosionsLayer);

  const explosionIcon = L.divIcon({
    html: '<span style="color:red;font-size:20px;">✹</span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  explosionsLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
    pointToLayer: (f, latlng) => L.marker(latlng, { icon: explosionIcon })
  }).addTo(map);
}

// Refresh all layers
async function refresh() {
  await loadTerritorial();
  await loadAlerts();
  await loadExplosions();
}

refresh();
setInterval(refresh, 30000); // update every 30 seconds
