'use client';

import { useEffect } from 'react';

export function ConfettiAnimation() {
  useEffect(() => {
    const run = async () => {
      const confetti = (await import('canvas-confetti')).default;
      const end = Date.now() + 3000;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#9333ea', '#ec4899', '#f43f5e'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#9333ea', '#ec4899', '#f43f5e'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    };

    run().catch(console.error);
  }, []);

  return null;
}
