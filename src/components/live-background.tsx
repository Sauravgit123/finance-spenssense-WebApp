'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, CircleDollarSign, RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconTypes = [
  { Icon: CircleDollarSign, baseSize: 16, color: 'text-yellow-400' },
  { Icon: TrendingUp, baseSize: 20, color: 'text-green-400' },
  { Icon: RectangleHorizontal, baseSize: 18, color: 'text-blue-400' },
];

const NUM_ICONS = 30;

interface IconDetail {
  id: number;
  Icon: React.ElementType;
  className: string;
  style: React.CSSProperties;
}

const generateIcons = (): IconDetail[] => {
  const icons: IconDetail[] = [];
  for (let i = 0; i < NUM_ICONS; i++) {
    const type = iconTypes[i % iconTypes.length];
    const scale = 0.5 + Math.random() * 1.5;
    const size = type.baseSize * scale;

    icons.push({
      id: i,
      Icon: type.Icon,
      className: cn('absolute opacity-60 blur-[1px] drop-shadow-md', type.color),
      style: {
        left: `${Math.random() * 100}vw`,
        top: '110vh',
        width: `${size}px`,
        height: `${size}px`,
        animationName: 'float-up',
        animationDuration: `${25 + Math.random() * 30}s`,
        animationDelay: `${Math.random() * -55}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        ['--end-rotation' as any]: `${-360 + Math.random() * 720}deg`,
      },
    });
  }
  return icons;
};

export function LiveBackground() {
  const [icons, setIcons] = useState<IconDetail[]>([]);

  useEffect(() => {
    // Icons are generated only on the client-side to avoid hydration mismatches
    setIcons(generateIcons());
  }, []);
  
  if (icons.length === 0) {
    // This part ensures the background is always rendered, even on SSR.
    return <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-gradient-to-br from-slate-950 to-gray-900 pointer-events-none" />;
  }

  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-gradient-to-br from-slate-950 to-gray-900 pointer-events-none">
      {icons.map(({ id, Icon, className, style }) => (
        <Icon key={id} className={className} style={style} strokeWidth={1} />
      ))}
    </div>
  );
}
