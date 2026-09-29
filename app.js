let map, bicycleMarker, homeMarker, geofenceCircle, routePolyline;
let routeCoordinates = [];
let mode = 'LIVE';

const backendUrl = 'https://smart-bicycle-tracker.onrender.com';

let state = {
    homeLat: 16.464181,
    homeLng: 80.507284,
    radiusKm: 5.0,
    currentLat: 16.506174,
    currentLng: 80.648015
};

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    setInterval(updateLoop, 3000);
});

function initMap() {
    map = L.map('map').setView([state.homeLat, state.homeLng], 13);
 L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 18
}).addTo(map);

    homeMarker = L.marker([state.homeLat, state.homeLng]).addTo(map).bindPopup("🏠 Home Location");
    bicycleMarker = L.marker([state.currentLat, state.currentLng]).addTo(map).bindPopup("🚲 Bicycle");
    
    geofenceCircle = L.circle([state.homeLat, state.homeLng], {
        color: 'green',
        fillColor: '#27ae60',
        fillOpacity: 0.15,
        radius: state.radiusKm * 1000
    }).addTo(map);

    routePolyline = L.polyline([], { color: 'blue' }).addTo(map);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function updateDashboard(lat, lng, accuracy = 5) {
    state.currentLat = lat;
    state.currentLng = lng;

    const dist = calculateDistance(state.homeLat, state.homeLng, lat, lng);
    const isInside = dist <= state.radiusKm;

    document.getElementById('val-lat').innerText = lat.toFixed(6);
    document.getElementById('val-lng').innerText = lng.toFixed(6);
    document.getElementById('val-acc').innerText = accuracy;
    document.getElementById('val-dist').innerText = dist.toFixed(2);
    document.getElementById('val-radius-disp').innerText = state.radiusKm.toFixed(2);

    const statusEl = document.getElementById('val-status');
    const alertBanner = document.getElementById('alert-banner');

    if (isInside) {
        statusEl.innerText = "🟢 INSIDE SAFE ZONE";
        statusEl.style.color = "green";
        geofenceCircle.setStyle({ color: 'green', fillColor: '#27ae60' });
        alertBanner.classList.add('hidden');
    } else {
        statusEl.innerText = "🔴 OUTSIDE SAFE ZONE";
        statusEl.style.color = "red";
        geofenceCircle.setStyle({ color: 'red', fillColor: '#e74c3c' });
        alertBanner.classList.remove('hidden');
    }

    document.getElementById('val-conn').innerText = "ONLINE";
    document.getElementById('val-gps').innerText = "CONNECTED";
    document.getElementById('val-time').innerText = new Date().toLocaleTimeString();

    const newPos = [lat, lng];
    bicycleMarker.setLatLng(newPos);
    routeCoordinates.push(newPos);
    routePolyline.setLatLngs(routeCoordinates);

    const tbody = document.querySelector('#history-table tbody');
    const row = `<tr>
        <td>${new Date().toLocaleTimeString()}</td>
        <td>${lat.toFixed(5)}</td>
        <td>${lng.toFixed(5)}</td>
        <td>${dist.toFixed(2)} km</td>
        <td>${isInside ? 'INSIDE' : 'OUTSIDE'}</td>
    </tr>`;
    tbody.insertAdjacentHTML('afterbegin', row);
}

function updateLoop() {
    if (mode === 'DEMO') {
        const randomOffset = (Math.random() - 0.45) * 0.01;
        state.currentLat += randomOffset;
        state.currentLng += randomOffset;
        updateDashboard(state.currentLat, state.currentLng);
    } else if (mode === 'LIVE') {
        fetch(`${backendUrl}/api/location/latest`)
            .then(res => res.json())
            .then(data => {
                if(data.latitude) updateDashboard(data.latitude, data.longitude, data.accuracy);
            })
            .catch(() => {
                document.getElementById('val-conn').innerText = "OFFLINE";
            });
    }
}

function setupEventListeners() {
    document.getElementById('btn-save-radius').onclick = () => {
        const val = parseFloat(document.getElementById('input-radius').value);
        if (val > 0) {
            state.radiusKm = val;
            geofenceCircle.setRadius(val * 1000);
            updateDashboard(state.currentLat, state.currentLng);
        }
    };

    document.getElementById('btn-set-home').onclick = () => {
        state.homeLat = state.currentLat;
        state.homeLng = state.currentLng;
        homeMarker.setLatLng([state.homeLat, state.homeLng]);
        geofenceCircle.setLatLng([state.homeLat, state.homeLng]);
        updateDashboard(state.currentLat, state.currentLng);
    };

    document.getElementById('mode-demo').onclick = () => setMode('DEMO');
    document.getElementById('mode-live').onclick = () => setMode('LIVE');
    document.getElementById('mode-phone').onclick = () => {
        setMode('PHONE');
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(pos => {
                updateDashboard(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            });
        }
    };
}

function setMode(m) {
    mode = m;
    document.querySelectorAll('.mode-controls .btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mode-${m.toLowerCase()}`).classList.add('active');
}
