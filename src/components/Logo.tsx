import React from 'react';

export const LOGO_URL = "https://ihqoctaqlxqtzxcriltf.supabase.co/storage/v1/object/public/Three%20Mister/Submark%20Primary%20Logo%203mr%20(No%20Background).png";
export const LOCAL_LOGO_URL = `${(import.meta as any).env?.BASE_URL || './'}logo-3mr.png`;

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export function Logo3MR({ className = '', size = 'md', showBadge = false }: LogoProps) {
  const imageSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-28 w-28',
  };

  const badgeWrapper = {
    sm: 'p-1 rounded-xl',
    md: 'p-1.5 rounded-xl',
    lg: 'p-2.5 rounded-2xl',
    xl: 'p-4 rounded-3xl',
  };

  const logoImg = (
    <img
      src={LOGO_URL}
      alt="3MR Logo"
      className={`object-contain select-none transition-transform duration-200 ${imageSizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        // Fallback to locally cached file if external CDN fails or is blocked
        if (!e.currentTarget.src.includes('logo-3mr.png')) {
          e.currentTarget.src = LOCAL_LOGO_URL;
        }
      }}
    />
  );

  if (showBadge) {
    return (
      <div 
        className={`inline-flex items-center justify-center bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-800 shadow-sm hover:shadow transition-shadow ${badgeWrapper[size]}`}
        title="Three Mister 3MR Logo"
      >
        {logoImg}
      </div>
    );
  }

  return logoImg;
}

export function Logo3MRVector({ className = 'w-10 h-10', title = 'Three Mister 3MR Logo' }: { className?: string; title?: string }) {
  return (
    <img 
      src={LOGO_URL} 
      alt={title}
      className={`object-contain select-none ${className}`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        if (!e.currentTarget.src.includes('logo-3mr.png')) {
          e.currentTarget.src = LOCAL_LOGO_URL;
        }
      }}
    />
  );
}
