'use client';

import React, { useEffect, useState } from 'react';
import { Flower2, Sparkles, Star } from 'lucide-react';
import type { WeatherMode } from '@/lib/types';

interface AmbientStarConfig {
  id: string;
  left: string;
  top: string;
  driftX: string;
  driftY: string;
  duration: string;
  delay: string;
  size: 'sm' | 'md' | 'lg';
  color: string;
  type: 'sparkle' | 'star' | 'petal';
}

// Lightweight corner & margin stars/petals rendered purely on GPU CSS keyframes
const AMBIENT_CORNER_STARS: AmbientStarConfig[] = [
  { id: 'amb-1', left: '3.5%', top: '10%', driftX: '18px', driftY: '96px', duration: '11s', delay: '0s', size: 'md', color: '#FFD166', type: 'sparkle' },
  { id: 'amb-2', left: '6.5%', top: '48%', driftX: '16px', driftY: '105px', duration: '12.5s', delay: '2.2s', size: 'sm', color: '#FFB3C1', type: 'petal' },
  { id: 'amb-3', left: '4.5%', top: '78%', driftX: '14px', driftY: '82px', duration: '10.5s', delay: '1.1s', size: 'sm', color: '#F4B860', type: 'star' },
  { id: 'amb-4', left: '94.5%', top: '12%', driftX: '-18px', driftY: '100px', duration: '11.5s', delay: '0.8s', size: 'lg', color: '#FFD166', type: 'sparkle' },
  { id: 'amb-5', left: '93.5%', top: '44%', driftX: '-20px', driftY: '110px', duration: '13.5s', delay: '3.1s', size: 'md', color: '#FFC2D1', type: 'petal' },
  { id: 'amb-6', left: '92.5%', top: '80%', driftX: '-12px', driftY: '80px', duration: '10s', delay: '1.7s', size: 'sm', color: '#FF8FA3', type: 'star' },
];

// Two gentle periodic shooting stars using pure CSS transform keyframes
const SHOOTING_STARS = [
  { id: 'shoot-left', startLeft: '12%', startTop: '7%', shootX: '135px', shootY: '90px', duration: '11s', delay: '1.5s', reverse: false },
  { id: 'shoot-right', startLeft: '82%', startTop: '11%', shootX: '-140px', shootY: '95px', duration: '13s', delay: '5.5s', reverse: true },
];

// Gentle warm golden sun motes for daytime sunbeam ambience
const SUN_MOTES = [
  { id: 'mote-1', left: '14%', top: '26%', moteX: '24px', moteY: '-52px', duration: '9.5s', delay: '0s', size: 6 },
  { id: 'mote-2', left: '28%', top: '18%', moteX: '18px', moteY: '-42px', duration: '11s', delay: '1.4s', size: 5 },
  { id: 'mote-3', left: '72%', top: '22%', moteX: '-20px', moteY: '-46px', duration: '10.5s', delay: '0.8s', size: 6 },
  { id: 'mote-4', left: '84%', top: '38%', moteX: '-16px', moteY: '-38px', duration: '12s', delay: '2.6s', size: 4 },
  { id: 'mote-5', left: '9%', top: '62%', moteX: '16px', moteY: '-34px', duration: '11.5s', delay: '3.2s', size: 5 },
];

// Slow gentle rain streaks (14 compositor-only droplets)
const SLOW_RAIN_DROPS = [
  { id: 'rain-1', left: '7%', height: '64px', duration: '4.6s', delay: '0s', opacity: '0.32' },
  { id: 'rain-2', left: '14%', height: '82px', duration: '5.2s', delay: '1.3s', opacity: '0.26' },
  { id: 'rain-3', left: '22%', height: '58px', duration: '4.4s', delay: '2.7s', opacity: '0.34' },
  { id: 'rain-4', left: '31%', height: '74px', duration: '5.5s', delay: '0.6s', opacity: '0.24' },
  { id: 'rain-5', left: '39%', height: '62px', duration: '4.8s', delay: '3.1s', opacity: '0.30' },
  { id: 'rain-6', left: '48%', height: '78px', duration: '5.4s', delay: '1.8s', opacity: '0.22' },
  { id: 'rain-7', left: '56%', height: '60px', duration: '4.7s', delay: '0.3s', opacity: '0.28' },
  { id: 'rain-8', left: '64%', height: '86px', duration: '5.6s', delay: '2.2s', opacity: '0.25' },
  { id: 'rain-9', left: '73%', height: '66px', duration: '4.5s', delay: '1.1s', opacity: '0.32' },
  { id: 'rain-10', left: '81%', height: '72px', duration: '5.1s', delay: '3.6s', opacity: '0.27' },
  { id: 'rain-11', left: '88%', height: '60px', duration: '4.9s', delay: '0.9s', opacity: '0.33' },
  { id: 'rain-12', left: '94%', height: '78px', duration: '5.3s', delay: '2.4s', opacity: '0.26' },
  { id: 'rain-13', left: '11%', height: '54px', duration: '5.0s', delay: '3.9s', opacity: '0.22' },
  { id: 'rain-14', left: '91%', height: '56px', duration: '4.7s', delay: '4.1s', opacity: '0.24' },
];

export function resolveEffectiveWeather(
  mode: WeatherMode,
  hour: number
): Exclude<WeatherMode, 'auto'> {
  if (mode !== 'auto') return mode;
  if (hour >= 6 && hour < 17) return 'sunny';
  if (hour >= 17 && hour < 21) return 'rain';
  return 'starlight';
}

interface StarfallAmbienceProps {
  weatherMode?: WeatherMode;
}

export default function StarfallAmbience({
  weatherMode = 'auto',
}: StarfallAmbienceProps) {
  const [currentHour, setCurrentHour] = useState<number>(() =>
    new Date().getHours()
  );

  useEffect(() => {
    const syncVisibility = () => {
      document.documentElement.classList.toggle('starfall-paused', document.hidden);
    };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);

    const hourTimer = window.setInterval(() => {
      const nextHour = new Date().getHours();
      setCurrentHour((prev) => (prev === nextHour ? prev : nextHour));
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.clearInterval(hourTimer);
    };
  }, []);

  const effectiveWeather = resolveEffectiveWeather(weatherMode, currentHour);
  if (effectiveWeather === 'off') {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="starfall-layer pointer-events-none fixed inset-0 z-20 overflow-hidden select-none"
    >
      {/* SUNNY: Warm Golden Sunbeams & Soft Drifting Dust Motes */}
      {effectiveWeather === 'sunny' && (
        <>
          <div
            className="absolute -top-24 -right-20 w-[34rem] h-[34rem] rounded-full opacity-75 dark:opacity-40"
            style={{
              background:
                'radial-gradient(circle, rgba(255,223,145,0.46) 0%, rgba(255,235,180,0.18) 46%, transparent 74%)',
            }}
          />
          <div
            className="starfall-anim absolute -top-28 right-[8%] w-52 h-[75vh] origin-top"
            style={
              {
                '--beam-rot': '-26deg',
                background:
                  'linear-gradient(180deg, rgba(255,222,140,0.22) 0%, rgba(255,238,185,0.08) 58%, transparent 100%)',
                animation: 'sunbeamSway 11s ease-in-out 0s infinite',
              } as React.CSSProperties
            }
          />
          <div
            className="starfall-anim absolute -top-24 right-[22%] w-36 h-[68vh] origin-top"
            style={
              {
                '--beam-rot': '-20deg',
                background:
                  'linear-gradient(180deg, rgba(255,230,165,0.18) 0%, rgba(255,240,200,0.06) 55%, transparent 100%)',
                animation: 'sunbeamSway 13.5s ease-in-out 2s infinite',
              } as React.CSSProperties
            }
          />

          {SUN_MOTES.map((mote) => (
            <span
              key={mote.id}
              className="starfall-anim absolute rounded-full bg-[#FFE08A] dark:bg-[#FFD6A5]"
              style={
                {
                  left: mote.left,
                  top: mote.top,
                  width: `${mote.size}px`,
                  height: `${mote.size}px`,
                  '--mote-x': mote.moteX,
                  '--mote-y': mote.moteY,
                  boxShadow: '0 0 8px rgba(255, 209, 102, 0.55)',
                  animation: `sunMoteFloat ${mote.duration} ease-in-out ${mote.delay} infinite`,
                } as React.CSSProperties
              }
            />
          ))}
        </>
      )}

      {/* RAIN: Slow Gentle Rain & Soft Atmospheric Mist */}
      {effectiveWeather === 'rain' && (
        <>
          <div
            className="absolute inset-0 opacity-65 dark:opacity-55"
            style={{
              background:
                'radial-gradient(circle at 20% 10%, rgba(189,224,254,0.22) 0%, transparent 48%), radial-gradient(circle at 85% 15%, rgba(216,196,226,0.2) 0%, transparent 46%)',
            }}
          />
          {SLOW_RAIN_DROPS.map((drop) => (
            <span
              key={drop.id}
              className="starfall-anim absolute top-0 w-[1.5px] rounded-full bg-gradient-to-b from-transparent via-[#9EC5E8]/75 to-[#FFB3C1]/55 dark:via-[#8FB8DE]/65 dark:to-[#FF9EB0]/45"
              style={
                {
                  left: drop.left,
                  height: drop.height,
                  '--rain-opacity': drop.opacity,
                  animation: `rainFallSlow ${drop.duration} linear ${drop.delay} infinite`,
                } as React.CSSProperties
              }
            />
          ))}
        </>
      )}

      {/* STARLIGHT: Quiet Corner Stars, Petals & Shooting Stars */}
      {effectiveWeather === 'starlight' && (
        <>
          <div
            className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-70 dark:opacity-45"
            style={{
              background:
                'radial-gradient(circle, rgba(255,229,236,0.55) 0%, rgba(255,240,243,0.18) 45%, transparent 72%)',
            }}
          />
          <div
            className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-70 dark:opacity-45"
            style={{
              background:
                'radial-gradient(circle, rgba(255,243,209,0.5) 0%, rgba(255,229,236,0.18) 45%, transparent 72%)',
            }}
          />

          {AMBIENT_CORNER_STARS.map((star) => {
            const sizeClass =
              star.size === 'lg'
                ? 'w-4 h-4'
                : star.size === 'md'
                  ? 'w-3.5 h-3.5'
                  : 'w-2.5 h-2.5';

            return (
              <div
                key={star.id}
                style={
                  {
                    left: star.left,
                    top: star.top,
                    color: star.color,
                    '--drift-x': star.driftX,
                    '--drift-y': star.driftY,
                    animation: `starfallDrift ${star.duration} ease-in-out ${star.delay} infinite`,
                  } as React.CSSProperties
                }
                className="starfall-anim absolute"
              >
                {star.type === 'sparkle' ? (
                  <Sparkles className={`${sizeClass} fill-current`} />
                ) : star.type === 'petal' ? (
                  <Flower2 className={`${sizeClass} fill-[#FFE5EC]/80`} />
                ) : (
                  <Star className={`${sizeClass} fill-current`} />
                )}
              </div>
            );
          })}

          {SHOOTING_STARS.map((shoot) => (
            <div
              key={shoot.id}
              style={
                {
                  left: shoot.startLeft,
                  top: shoot.startTop,
                  '--shoot-x': shoot.shootX,
                  '--shoot-y': shoot.shootY,
                  animation: `starfallShoot ${shoot.duration} ease-out ${shoot.delay} infinite`,
                } as React.CSSProperties
              }
              className="starfall-anim absolute flex items-center"
            >
              <div className="relative flex items-center">
                <span
                  className={`block h-[1.5px] w-11 bg-gradient-to-r from-transparent via-[#FFD166]/70 to-[#FF8FA3] rounded-full ${
                    shoot.reverse ? 'rotate-145 origin-right' : 'rotate-35 origin-left'
                  }`}
                />
                <Sparkles className="w-3.5 h-3.5 text-[#FFD166] fill-[#FFD166] -ml-1" />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
