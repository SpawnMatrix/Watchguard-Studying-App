import React from 'react';

interface RadialProgressProps {
  percentage: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({
  percentage,
  label,
  size = 120,
  strokeWidth = 10,
  color = '#FF8C00' // WatchGuard Orange
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#333333"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-300 text-center max-w-[120px]">{label}</span>
    </div>
  );
};
