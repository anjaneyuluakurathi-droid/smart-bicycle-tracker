const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db = {
    settings: {
        homeLat: 16.506174,
        homeLng: 80.648015,
        radiusKm: 5.0,
        guardianPhone: "+919876543210"
    },
    latestLocation: {
        deviceId: "BICYCLE_001",
        latitude: 16.506174,
        longitude: 80.648015,
        accuracy: 3.5,
        timestamp: new Date().toISOString(),
        distanceFromHome: 0,
        geofenceStatus: "INSIDE",
        status: "ONLINE"
    },
    locationHistory: [],
    alerts: []
};

function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

app.post('/api/location', (req, res) => {
    const { deviceId, latitude, longitude, accuracy } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: "Invalid coordinates" });

    const distance = calculateHaversine(db.settings.homeLat, db.settings.homeLng, latitude, longitude);
    const status = distance > db.settings.radiusKm ? "OUTSIDE" : "INSIDE";
    const timestamp = new Date().toISOString();

    const locationData = {
        deviceId: deviceId || "BICYCLE_001",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy || 5,
        timestamp,
        distanceFromHome: distance,
        geofenceStatus: status,
        status: "ONLINE"
    };

    if (status === "OUTSIDE" && db.latestLocation.geofenceStatus === "INSIDE") {
        db.alerts.unshift({
            id: Date.now(),
            message: `Bicycle crossed ${db.settings.radiusKm} km safe zone`,
            latitude, longitude, distance, timestamp
        });
    }

    db.latestLocation = locationData;
    db.locationHistory.unshift(locationData);
    res.status(200).json({ success: true, status, distance });
});

app.get('/api/location/latest', (req, res) => res.json(db.latestLocation));
app.get('/api/location/history', (req, res) => res.json(db.locationHistory));
app.get('/api/settings', (req, res) => res.json(db.settings));
app.post('/api/settings', (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    res.json({ success: true, settings: db.settings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
