import { redirect } from '@remix-run/node';

export async function loader({ request }) {
  const response = await fetch(`${request.url.replace('/test.gps-batch', '/api/gps/batch')}`, {
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  });
  
  return response;
} 