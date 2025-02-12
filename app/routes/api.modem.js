import { getCompassAccessToken } from '../compass.server';

export async function fetchModemData(modemId, provider) {
  try {
    const accessToken = await getCompassAccessToken();
    const companyId = process.env.COMPASS_COMPANY_ID;
    
    // Use the correct API endpoint format from compass.server.js
    const response = await fetch(
      `https://api-compass.speedcast.com/v2.0/${provider.toLowerCase()}/${modemId}`, 
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch modem data: ${response.status}`);
    }

    const data = await response.json();
    return {
      modem: data,
      gpsData: data.gps || [],
      latencyData: data.latency?.data || [],
      throughputData: data.throughput?.data || [],
      signalQualityData: data.signal?.data || [],
      obstructionData: data.obstruction?.data || [],
      usageData: data.usage || [],
      uptimeData: data.uptime?.data || [],
    };
  } catch (error) {
    console.error('Error fetching modem data:', error);
    throw error;
  }
} 