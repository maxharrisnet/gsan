import { json } from '@remix-run/node';

export async function loader({ request }) {
  try {
    // Get base URL from request
    const baseUrl = new URL(request.url).origin;
    
    console.log('🚀 Testing GPS batch endpoint...');
    console.log('🔑 CRON_SECRET present:', !!process.env.CRON_SECRET);

    const response = await fetch(`${baseUrl}/api/gps/batch`, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    const data = await response.json();
    
    console.log('📡 Response status:', response.status);
    console.log('📦 Response data:', data);

    return json({
      status: response.status,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    return json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 