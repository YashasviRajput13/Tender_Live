import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon-only' | 'header';
  height?: number | string;
}

export default function Logo({ className = '', variant = 'full', height = '100%' }: LogoProps) {
  const gradientId = "gold-logo-gradient";

  if (variant === 'icon-only') {
    return (
      <svg 
        viewBox="0 0 120 120" 
        height={height} 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5DFB8" />
            <stop offset="25%" stopColor="#E6C89C" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="75%" stopColor="#9A7B30" />
            <stop offset="100%" stopColor="#D8BD8A" />
          </linearGradient>
        </defs>
        {/* Outer Circle */}
        <circle 
          cx="60" 
          cy="60" 
          r="50" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="7" 
        />
        {/* Inner Circle */}
        <circle 
          cx="60" 
          cy="60" 
          r="37" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="3" 
        />
        {/* TL Text */}
        <text 
          x="60" 
          y="71" 
          textAnchor="middle" 
          fill={`url(#${gradientId})`} 
          fontSize="34" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          style={{ letterSpacing: '0.02em' }}
        >
          TL
        </text>
      </svg>
    );
  }

  if (variant === 'header') {
    // Compact version for headers where space is premium
    return (
      <svg 
        viewBox="0 0 380 90" 
        height={height} 
        className={className}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5DFB8" />
            <stop offset="25%" stopColor="#E6C89C" />
            <stop offset="50%" stopColor="#C9A84C" />
            <stop offset="75%" stopColor="#9A7B30" />
            <stop offset="100%" stopColor="#D8BD8A" />
          </linearGradient>
        </defs>
        
        {/* Circle part */}
        <g transform="translate(5, 5)">
          <circle 
            cx="40" 
            cy="40" 
            r="36" 
            stroke={`url(#${gradientId})`} 
            strokeWidth="5" 
          />
          <circle 
            cx="40" 
            cy="40" 
            r="26" 
            stroke={`url(#${gradientId})`} 
            strokeWidth="2.2" 
          />
          <text 
            x="40" 
            y="48" 
            textAnchor="middle" 
            fill={`url(#${gradientId})`} 
            fontSize="24" 
            fontWeight="900" 
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          >
            TL
          </text>
        </g>

        {/* Text and Line part */}
        <g transform="translate(100, 5)">
          <text 
            x="0" 
            y="35" 
            fill={`url(#${gradientId})`} 
            fontSize="32" 
            fontWeight="900" 
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            style={{ letterSpacing: '0.04em' }}
          >
            TENDER LIVE
          </text>
          
          <line 
            x1="0" 
            y1="47" 
            x2="265" 
            y2="47" 
            stroke={`url(#${gradientId})`} 
            strokeWidth="3" 
          />

          <text 
            x="1" 
            y="64" 
            fill={`url(#${gradientId})`} 
            fontSize="12.5" 
            fontWeight="700" 
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            style={{ letterSpacing: '0.18em' }}
          >
            AI Powered Tender Intelligence
          </text>
        </g>
      </svg>
    );
  }

  // Full variant
  return (
    <svg 
      viewBox="0 0 560 120" 
      height={height} 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5DFB8" />
          <stop offset="25%" stopColor="#E6C89C" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="75%" stopColor="#9A7B30" />
          <stop offset="100%" stopColor="#D8BD8A" />
        </linearGradient>
      </defs>
      
      {/* Circle part */}
      <g transform="translate(10, 0)">
        <circle 
          cx="60" 
          cy="60" 
          r="50" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="7" 
        />
        <circle 
          cx="60" 
          cy="60" 
          r="37" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="3" 
        />
        <text 
          x="60" 
          y="71" 
          textAnchor="middle" 
          fill={`url(#${gradientId})`} 
          fontSize="34" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          TL
        </text>
      </g>

      {/* Text and Line part */}
      <g transform="translate(145, 0)">
        <text 
          x="0" 
          y="52" 
          fill={`url(#${gradientId})`} 
          fontSize="48" 
          fontWeight="900" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          style={{ letterSpacing: '0.04em' }}
        >
          TENDER LIVE
        </text>
        
        <line 
          x1="0" 
          y1="68" 
          x2="390" 
          y2="68" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="4" 
        />

        <text 
          x="2" 
          y="92" 
          fill={`url(#${gradientId})`} 
          fontSize="18.5" 
          fontWeight="700" 
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          style={{ letterSpacing: '0.19em' }}
        >
          AI Powered Tender Intelligence
        </text>
      </g>
    </svg>
  );
}
