// import Alpine from 'alpinejs';
import * as L from 'leaflet';

// import 'leaflet/dist/leaflet.css';
// import './style.css'

window.onload = () => {
  // Alpine.start();

  // Initialize the map
  const map = L.map('map', {
    center: [51.505, -0.09],
    zoom: 13
  });

  // Add a tile layer to the map
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    // Set the map view to the user's location
    map.setView([latitude, longitude], 13);

    // Add a marker to the map
    L.marker([latitude, longitude]).addTo(map)
      .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
      .openPopup();
  }, (error) => {
    console.error('Error getting location:', error);
    // Fallback to a default location if geolocation fails
    map.setView([51.505, -0.09], 13);
  }
  );

}