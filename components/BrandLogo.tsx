import React from 'react';

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
  textPosition?: 'right' | 'bottom';
  variant?: 'light' | 'dark' | 'brand';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  showText = true,
  textPosition = 'right',
  variant = 'brand',
  className = '',
  ...props
}) => {
  // Determine color matching logo
  const textColor = variant === 'light' ? 'text-parchment' : variant === 'dark' ? 'text-ink' : 'text-brass';
  const logoColor = variant === 'light' ? '#f1e9d6' : variant === 'dark' ? '#0a1a30' : '#cba85c';

  const logoSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={logoColor}
      className="shrink-0 transition-transform duration-300 hover:rotate-12"
      {...props}
    >
      {/* Outer ticks at 45 degrees */}
      <line x1="36" y1="36" x2="24" y2="24" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="64" y1="36" x2="76" y2="24" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="64" y1="66" x2="76" y2="76" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="66" x2="24" y2="76" strokeWidth="2.5" strokeLinecap="round" />

      {/* Concentric Double Arcs (Outer Casing) */}
      {/* Top-Right */}
      <path d="M 64.14 24.14 A 36.5 36.5 0 0 1 75.86 35.86" strokeWidth="1.8" />
      <path d="M 66.97 18.03 A 45.2 45.2 0 0 1 81.97 33.03" strokeWidth="1.8" />
      
      {/* Bottom-Right */}
      <path d="M 75.86 64.14 A 36.5 36.5 0 0 1 64.14 75.86" strokeWidth="1.8" />
      <path d="M 81.97 66.97 A 45.2 45.2 0 0 1 66.97 81.97" strokeWidth="1.8" />
      
      {/* Bottom-Left */}
      <path d="M 35.86 75.86 A 36.5 36.5 0 0 1 24.14 64.14" strokeWidth="1.8" />
      <path d="M 33.03 81.97 A 45.2 45.2 0 0 1 18.03 66.97" strokeWidth="1.8" />
      
      {/* Top-Left */}
      <path d="M 24.14 35.86 A 36.5 36.5 0 0 1 35.86 24.14" strokeWidth="1.8" />
      <path d="M 18.03 33.03 A 45.2 45.2 0 0 1 33.03 18.03" strokeWidth="1.8" />

      {/* Cardinal Letters (N, E, S, W) - crisp placement */}
      <text x="50" y="22" textAnchor="middle" fontWeight="800" fontSize="10.5" fill={logoColor} stroke="none" fontFamily="system-ui, sans-serif">N</text>
      <text x="83.5" y="53.5" textAnchor="middle" fontWeight="800" fontSize="10.5" fill={logoColor} stroke="none" fontFamily="system-ui, sans-serif">E</text>
      <text x="50" y="87" textAnchor="middle" fontWeight="800" fontSize="10.5" fill={logoColor} stroke="none" fontFamily="system-ui, sans-serif">S</text>
      <text x="16.5" y="53.5" textAnchor="middle" fontWeight="800" fontSize="10.5" fill={logoColor} stroke="none" fontFamily="system-ui, sans-serif">W</text>

      {/* Inner Globe */}
      <circle cx="50" cy="50" r="14" strokeWidth="2" />

      {/* Globe grid lines */}
      <path d="M 36 50 H 64 M 38 45.5 H 62 M 38 54.5 H 62" strokeWidth="1.2" />
      <path d="M 50 36 V 64" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 50 36 C 43 41 43 59 50 64" strokeWidth="1.2" />
      <path d="M 50 36 C 47.2 40.5 47.2 59.5 50 64" strokeWidth="0.8" />
      <path d="M 50 36 C 52.8 40.5 52.8 59.5 50 64" strokeWidth="0.8" />
      <path d="M 50 36 C 57 41 57 59 50 64" strokeWidth="1.2" />

      {/* Compass cardinal triangular pointers */}
      <polygon points="50,23.5 47,35 53,35" fill={logoColor} stroke="none" />
      <polygon points="50,76.5 47,65 53,65" fill={logoColor} stroke="none" />
      <polygon points="23.5,50 35,47 35,53" fill={logoColor} stroke="none" />
      <polygon points="76.5,50 65,47 65,53" fill={logoColor} stroke="none" />

      {/* Secondary diagonal stars pointing inwards */}
      <line x1="39.5" y1="39.5" x2="43" y2="43" strokeWidth="1.2" />
      <line x1="60.5" y1="39.5" x2="57" y2="43" strokeWidth="1.2" />
      <line x1="60.5" y1="60.5" x2="57" y2="57" strokeWidth="1.2" />
      <line x1="39.5" y1="60.5" x2="43" y2="57" strokeWidth="1.2" />
    </svg>
  );

  if (!showText) {
    return logoSvg;
  }

  if (textPosition === 'bottom') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {logoSvg}
        <div className="text-center">
          <h2 className={`font-black tracking-widest text-[22px] font-sans ${textColor}`}>NOMAD</h2>
          <p className={`text-[9px] font-semibold tracking-[0.25em] text-inkfaint uppercase`}>CONSULTING</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoSvg}
      <div className="flex flex-col text-left leading-none">
        <h2 className={`font-sans font-extrabold tracking-widest text-lg ${textColor}`}>
          NOMAD <span className={variant === 'light' ? 'text-inkmute' : 'text-inkfaint'}>COMPASS</span>
        </h2>
        <p className={`text-[8px] font-bold tracking-[0.3em] duration-300 text-inkfaint opacity-90`}>
          BY NOMAD CONSULTING
        </p>
      </div>
    </div>
  );
};
