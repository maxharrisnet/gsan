import { Line } from 'react-chartjs-2';

export default function LatencyChart({ latencyData, modem }) {
  if (!latencyData || latencyData.length === 0) {
    return <div className='no-latency-message'>No Data Available</div>;
  }

  return (
    <div className='latency-bar-container'>
      <div className='latency-bar'>
        <Line
          height='50'
          data={{
            labels: latencyData.map(d => new Date(d[0] * 1000).toLocaleTimeString()),
            datasets: [{
              data: latencyData.map(d => d[1]),
              borderColor: '#3986a8',
              tension: 0.4
            }]
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }}
        />
        <div className='latency-tooltip' />
      </div>
    </div>
  );
} 