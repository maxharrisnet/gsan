import { useHydrated } from '@remix-run/react';

function Map({ /* your props */ }) {
  const isHydrated = useHydrated();

  if (!isHydrated) {
    // Return a placeholder while server-side rendering
    return <div className="map-placeholder">Loading map...</div>;
  }

  // Your existing map component code
  return (
    <APIProvider apiKey={YOUR_API_KEY}>
      {/* Your Google Maps component */}
    </APIProvider>
  );
}

export default Map; 