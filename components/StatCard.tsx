import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  gradientFrom: string;
  gradientTo: string;
  sparklineData?: { value: number }[];
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  trend, 
  trendDirection = 'neutral', 
  icon, 
  description,
  gradientFrom,
  gradientTo,
  sparklineData,
  subValue
}) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group bg-gradient-to-br ${gradientFrom} ${gradientTo}`}>
      
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500"></div>
      
      <div className="relative z-10 text-white">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'text-white w-5 h-5' })}
          </div>
          
          {trend && (
            <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md bg-white/20 border border-white/10 shadow-sm`}>
              {trendDirection === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trend}
            </div>
          )}
        </div>

        <h3 className="text-white/80 text-sm font-medium uppercase tracking-wider mb-1 mt-4">{title}</h3>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tracking-tight drop-shadow-sm">{value}</div>
          {subValue && <span className="text-sm font-medium text-white/70">{subValue}</span>}
        </div>
        
        {description && (
          <p className="text-white/70 text-xs mt-1 flex items-center font-light">
             {description}
          </p>
        )}
      </div>

      {/* Sparkline Chart */}
      {sparklineData && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-50 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#fff" 
                fill="#fff" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};