import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

function Map({ markers = [], route = null }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [46.6753, 24.7136],
      zoom: 11
    });

    map.current.addControl(new mapboxgl.NavigationControl());
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const existingMarkers = map.current._markers || [];
    existingMarkers.forEach(marker => marker.remove());
    map.current._markers = [];

    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = marker.color || '#3b82f6';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';

      const mapMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<p>${marker.label || ''}</p>`))
        .addTo(map.current);

      map.current._markers.push(mapMarker);
    });

    if (route) {
      if (map.current.getSource('route')) {
        map.current.getSource('route').setData(route);
      } else {
        map.current.addSource('route', {
          type: 'geojson',
          data: route
        });
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4
          }
        });
      }
    }

    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(m => bounds.extend([m.longitude, m.latitude]));
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [markers, route]);

  return <div ref={mapContainer} className="map-container" />;
}

export default Map;
