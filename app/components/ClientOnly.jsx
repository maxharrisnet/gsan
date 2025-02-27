import { useState, useEffect } from 'react';

function ClientOnly({ children, fallback = null }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? children : fallback;
}

// Usage in your map component:
function MapContainer({ /* your props */ }) {
  return (
    <ClientOnly fallback={<div className="map-placeholder">Loading map...</div>}>
      <APIProvider apiKey={YOUR_API_KEY}>
        {/* Your Google Maps component */}
      </APIProvider>
    </ClientOnly>
  );
}

export default MapContainer; 