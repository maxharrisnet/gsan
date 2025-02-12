import { useEffect, useState } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import 'leaflet/dist/leaflet.css';

function Map({ center, zoom = 8, markers = [], style }) {
	// Dynamically import Leaflet components on the client side
	const [MapComponents, setMapComponents] = useState(null);

	useEffect(() => {
		// Import Leaflet components only on the client side
		const loadMap = async () => {
			const L = await import('leaflet');
			const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet');

			setMapComponents({ L, MapContainer, TileLayer, Marker, Popup });
		};

		loadMap();
	}, []);

	if (!MapComponents) {
		return <div>Loading map...</div>;
	}

	const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

	return (
		<MapContainer
			center={center}
			zoom={zoom}
			style={style}
		>
			<TileLayer
				url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			/>
			{markers.map((marker) => (
				<Marker
					key={marker.id}
					position={[marker.lat, marker.lng]}
					icon={customIcon}
				>
					<Popup>
						{marker.name}
						<br />
						Status: {marker.status}
					</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}

// Wrap the map component with ClientOnly
export default function SatelliteMap(props) {
	return <ClientOnly fallback={<div>Loading map...</div>}>{() => <Map {...props} />}</ClientOnly>;
}
