import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const scaleMap = {
    sm: 'scale-75 origin-top-left',
    md: 'scale-100',
    lg: 'scale-110'
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${scaleMap[size]} ${className}`}>
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Outer Glow & Soft 3D Shadow */}
        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl"></div>

        {/* Outer Circular Ring (3D Clay Effect) */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-1.5 shadow-[0_10px_20px_rgba(37,99,235,0.35),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-blue-400/50 flex flex-col items-center justify-between overflow-hidden">
          
          {/* Curved Text Arc Representation */}
          <div className="w-full text-center mt-1 z-10">
            <span className="text-[9px] font-black tracking-widest text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              PGRI GELANG
            </span>
          </div>

          {/* Inner Golden/Orange Circle Container */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-1 shadow-[inset_0_3px_6px_rgba(255,255,255,0.6),0_4px_8px_rgba(0,0,0,0.2)] border border-amber-200 flex flex-col items-center justify-center -mt-1">
            
            {/* Book Graphic */}
            <div className="relative -mt-1 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-900 drop-shadow-[0_2px_3px_rgba(255,255,255,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" opacity="0.1" />
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm7-10h-6V5h6v2z" />
              </svg>
              {/* White Open Book Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/95 rounded px-1 py-0.5 shadow-sm border border-amber-200 flex items-center gap-0.5">
                  <div className="w-2.5 h-3 bg-blue-500 rounded-left border-r border-blue-200"></div>
                  <div className="w-2.5 h-3 bg-amber-500 rounded-right"></div>
                </div>
              </div>
            </div>

            {/* Bold '3' Badge */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-extrabold text-sm px-2.5 py-0.5 rounded-full border-2 border-white shadow-md -mt-1 z-10 leading-none">
              3
            </div>
          </div>

          {/* Spacer */}
          <div className="h-2"></div>
        </div>

        {/* Bottom Yellow Ribbon Banner "SUMBERBARU" */}
        <div className="absolute -bottom-1.5 z-20 w-32 flex items-center justify-center">
          <div className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-blue-950 font-black text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-[0_4px_10px_rgba(217,119,6,0.4)] border-2 border-white flex items-center justify-center gap-1">
            <span className="drop-shadow-[0_1px_0px_rgba(255,255,255,0.8)]">SUMBERBARU</span>
          </div>
        </div>
      </div>
    </div>
  );
};
