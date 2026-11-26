import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BarChart3, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../config/api';

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Generate analytics based on readings
    apiRequest('/devices').then(async (devs) => {
      if (devs && devs.length > 0) {
        const hist = await apiRequest(`/telemetry/history/${devs[0].id}?limit=20`);
        setData(hist || []);
      }
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Sensor Analytics & Environmental Metrics
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Aggregated air-quality and heat index analytics across monitored agricultural zones
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-charcoal-900 p-6 rounded-2xl border border-gray-200 dark:border-forest-900 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          Air Quality (MQ-135) Distribution Trend
        </h3>
        {data.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="timestamp" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111d16',
                    borderColor: '#245740',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="mq135_ppm" fill="#22c55e" radius={[4, 4, 0, 0]} name="MQ-135 (ppm)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            Awaiting telemetry points for graphical analysis.
          </div>
        )}
      </div>
    </div>
  );
};
