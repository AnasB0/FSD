import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

function Map({ markers = [], routes = [], center = [46.6753, 24.7136], zoom = 11 }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = marker.color || '#3b82f6';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';

      new mapboxgl.Marker(el)
        .setLngLat(marker.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div><strong>${marker.title}</strong><p>${marker.description || ''}</p></div>`
          )
        )
        .addTo(map.current);
    });
  }, [markers]);

  useEffect(() => {
    if (!map.current || routes.length === 0) return;

    routes.forEach((route, index) => {
      const layerId = `route-${index}`;
      
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
        map.current.removeSource(layerId);
      }

      map.current.addSource(layerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        },
      });

      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: layerId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': route.color || '#3b82f6',
          'line-width': 4,
        },
      });
    });
  }, [routes]);

  return <div ref={mapContainer} className="map-container" />;
}

export default Map;
