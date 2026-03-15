/**
 * PhoneFrame - iPhone-style device frame
 * 
 * Used to show mobile constraint and final mobile layout.
 */
import React from 'react';
import { TUFTE_MOBILE_SPEC } from '../spec';

interface PhoneFrameProps {
  children: React.ReactNode;
  scale?: number;
  opacity?: number;
  showNotch?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  scale = 1,
  opacity = 1,
  showNotch = true,
}) => {
  const { phone, colors } = TUFTE_MOBILE_SPEC;
  const frameScale = phone.scale * scale;
  
  return (
    <div
      style={{
        width: phone.width * frameScale,
        height: phone.height * frameScale,
        borderRadius: phone.borderRadius * frameScale,
        border: `${3 * frameScale}px solid ${colors.fgTertiary}`,
        background: colors.bgBase,
        position: 'relative',
        overflow: 'hidden',
        opacity,
      }}
    >
      {/* Dynamic Island / Notch */}
      {showNotch && (
        <div
          style={{
            position: 'absolute',
            top: 12 * frameScale,
            left: '50%',
            transform: 'translateX(-50%)',
            width: phone.notchWidth * frameScale,
            height: phone.notchHeight * frameScale,
            borderRadius: (phone.notchHeight / 2) * frameScale,
            background: colors.bgBase,
            border: `${1 * frameScale}px solid ${colors.borderDefault}`,
            zIndex: 10,
          }}
        />
      )}
      
      {/* Content area */}
      <div
        style={{
          position: 'absolute',
          top: 60 * frameScale,
          left: 16 * frameScale,
          right: 16 * frameScale,
          bottom: 34 * frameScale,
          display: 'flex',
          flexDirection: 'column',
          gap: 12 * frameScale,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      
      {/* Home indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 8 * frameScale,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 134 * frameScale,
          height: 5 * frameScale,
          borderRadius: 2.5 * frameScale,
          background: colors.fgTertiary,
        }}
      />
    </div>
  );
};

export default PhoneFrame;
