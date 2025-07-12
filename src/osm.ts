import * as L from 'leaflet';

export default class Osm {

    static ZOOM = 13;
    static FALLBACK_COORDS: L.LatLngExpression = [51.505, -0.09];

    static icon = L.divIcon({
        className: 'custom-icon',
        html: '<svg class="h-7 w-7 inline shadow-lg"><use href="/app.svg#icon-crosshairs-gps"></use></svg>',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
    });

    static map: L.Map | null = null;
    static positionMarker: L.Marker | null = null;

    static validate() {
        console.debug(`Osm.validate() called`);

        if (!L || !L.map || !L.marker || !L.divIcon) {
            throw new Error('Leaflet is not properly loaded. Ensure you have included the Leaflet library.');
        }

        if (!document.getElementById('map')) {
            throw new Error('Map container element with id "map" not found in the document.');
        }

        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser.');
        }

        if (!Osm.map) {
            throw new Error('Map is not initialized. Call Osm.start() before using other methods.');
        }

        if (Osm.positionMarker && !Osm.map) {
            throw new Error('Position marker exists but map is not initialized. Call Osm.start() first.');
        }

        console.debug('Osm.validate() completed successfully');
    }

    static start() {
        console.debug(`Osm.start() called`);

        if (!Osm.map) {
            console.debug('Initializing map...');

            Osm.map = L.map('map', {
                center: Osm.FALLBACK_COORDS,
                zoom: Osm.ZOOM,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(Osm.map);
        }
    }

    static locate() {
        console.debug(`Osm.locate() called`);

        Osm.validate();

        navigator.geolocation.getCurrentPosition(({ coords }) => {
            console.debug('Geolocation success:', coords);

            const lat = coords.latitude;
            const lng = coords.longitude;

            Osm.map!.setView([lat, lng], Osm.ZOOM);

            if (Osm.positionMarker) {
                console.debug('Removing existing position marker');

                Osm.map!.removeLayer(Osm.positionMarker);
                Osm.positionMarker = null;
            }

            console.debug('Adding new position marker at:', lat, lng);

            Osm.positionMarker = L.marker([lat, lng], { icon: Osm.icon });
            Osm.positionMarker.addTo(Osm.map!);

        }, (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to retrieve your location. Please check your browser settings.');

            Osm.map!.setView(Osm.FALLBACK_COORDS, Osm.ZOOM);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    }
}