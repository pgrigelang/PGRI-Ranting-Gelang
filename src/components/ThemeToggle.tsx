import React from 'react';

interface ThemeToggleProps {
  theme?: 'light' | 'dark';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme = 'light', onToggle }) => {
  const isLight = theme === 'light';

  return (
    <div className="theme-switch-wrapper inline-flex items-center shrink-0">
      <style>{`
        .theme-switch-wrapper {
          display: flex;
          align-items: center;
        }

        .theme-switch {
          position: relative;
          display: inline-block;
          width: 68px;
          height: 32px;
          cursor: pointer;
        }

        .theme-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider-track {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #111422;
          transition: background-color 0.4s ease;
          border-radius: 50px;
          overflow: hidden;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.4), 0 0 6px rgba(0,0,0,0.1);
          border: 1px solid #334155;
        }

        .theme-switch input:checked + .slider-track {
          background-color: #52a5f7;
          border-color: #38bdf8;
        }

        .slider-thumb {
          position: absolute;
          content: "";
          height: 24px;
          width: 24px;
          left: 3px;
          bottom: 3px;
          background-color: #cbd5e1;
          transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), background-color 0.4s ease;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 2;
        }

        .theme-switch input:checked + .slider-track .slider-thumb {
          transform: translateX(36px);
          background-color: #facc15;
          box-shadow: 0 0 10px #fde047;
        }

        .crater {
          position: absolute;
          background-color: #94a3b8;
          border-radius: 50%;
          transition: opacity 0.3s ease;
        }
        .crater-1 { width: 5px; height: 5px; top: 4px; left: 6px; }
        .crater-2 { width: 6px; height: 6px; bottom: 4px; right: 4px; }
        .crater-3 { width: 3px; height: 3px; top: 10px; right: 8px; }

        .theme-switch input:checked + .slider-track .crater {
          opacity: 0;
        }

        .stars {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: opacity 0.4s ease, transform 0.4s ease;
          opacity: 1;
        }

        .star {
          position: absolute;
          background-color: #fde047;
          border-radius: 50%;
          box-shadow: 0 0 3px #fde047;
        }

        .star-1 { width: 2px; height: 2px; top: 8px; right: 14px; }
        .star-2 { width: 2.5px; height: 2.5px; top: 18px; right: 24px; }
        .star-3 { width: 3px; height: 3px; bottom: 6px; right: 10px; }

        .theme-switch input:checked + .slider-track .stars {
          opacity: 0;
          transform: translateY(-8px);
        }

        .clouds {
          position: absolute;
          bottom: -4px;
          left: 4px;
          width: 100%;
          height: 100%;
          transition: opacity 0.4s ease, transform 0.4s ease;
          opacity: 0;
          transform: translateY(8px);
        }

        .cloud {
          position: absolute;
          background-color: #e0f2fe;
          border-radius: 20px;
          opacity: 0.9;
        }

        .cloud-1 { width: 20px; height: 10px; bottom: 6px; left: 6px; }
        .cloud-2 { width: 14px; height: 8px; bottom: 9px; left: 14px; }

        .theme-switch input:checked + .slider-track .clouds {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <label
        className="theme-switch"
        title={isLight ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
      >
        <input
          type="checkbox"
          checked={isLight}
          onChange={onToggle}
        />
        <div className="slider-track">
          <div className="slider-thumb">
            <div className="crater crater-1" />
            <div className="crater crater-2" />
            <div className="crater crater-3" />
          </div>

          <div className="stars">
            <div className="star star-1" />
            <div className="star star-2" />
            <div className="star star-3" />
          </div>

          <div className="clouds">
            <div className="cloud cloud-1" />
            <div className="cloud cloud-2" />
          </div>
        </div>
      </label>
    </div>
  );
};