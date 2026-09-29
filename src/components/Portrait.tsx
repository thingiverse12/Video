import { useId } from 'react';
import type { PlayerId } from '../game/types';

/** Egna illustrerade porträtt som matchar spelfigurerna (varselväst, mage och skägg), inga fotografier. */
export function Portrait({ character, className = '' }: { character: PlayerId; className?: string }) {
  const id = useId();
  const leffe = character === 'leffe';
  const skin = leffe ? '#d9b08b' : '#ebc8ab';
  const vest = leffe ? '#ff7a1f' : '#dfe83a';
  const vestShade = leffe ? '#d85a0c' : '#b9c227';
  const beard = leffe ? '#4a3c36' : '#a67a4b';
  return (
    <svg className={className} viewBox="0 0 80 80" role="img" aria-label={leffe ? 'Leffe i orange varselväst över rutig skjorta, med glasögon och gråsprängt skägg' : 'Bill i gul varselväst över lila huvtröja, med ljust hår och rödblont skägg'}>
      <defs>
        <clipPath id={id}><circle cx="40" cy="40" r="39" /></clipPath>
        <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor={leffe ? '#d8e7da' : '#e5d9ec'} /><stop offset="1" stopColor={leffe ? '#89ac9b' : '#a8a0ca'} /></linearGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path fill={`url(#${id}-bg)`} d="M0 0h80v80H0z" />
        <circle cx="62" cy="16" r="12" fill="#fff8d5" opacity=".4" />
        {/* Jacka/huvtröja med rund mage */}
        <path fill={leffe ? '#266c78' : '#715788'} d="M2 81V66c0-12 16-19 38-19s38 7 38 19v15H2Z" />
        {leffe ? <>
          {/* Rutig skjorta i västöppningen */}
          <path fill="#d9c27a" d="M29 55q11-6 22 0l3 26H26Z" />
          <path d="M32 60h16M31 68h18M30 76h20M36 57v24m8-24v24" stroke="#a6854a" strokeWidth="1" opacity=".7" />
          <path fill="#e9c26d" d="m36 56 4 9 4-9 4 8-6 17h-4l-6-17 4-8Z" />
        </> : <>
          <path fill="#5e4a78" d="M31 55q9-5 18 0l3 26H28Z" />
          <path fill="#5b4774" d="M31 70q9-4 18 0v11H31V70Z" />
          <path d="M37 55v11m6-11v11" stroke="#e2d1aa" strokeWidth="2" />
        </>}
        {/* Varselväst: två framstycken som hänger öppna över magen, med reflexband */}
        <path fill={vest} d="M6 81V63q1-8 10-13l8-4 6 5 2 30H6Z" />
        <path fill={vest} d="M74 81V63q-1-8-10-13l-8-4-6 5-2 30h26Z" />
        <path fill={vestShade} d="m24 46 6 5-2 3-6-4Zm32 0-6 5 2 3 6-4Z" />
        <path d="M6 68h26M48 68h26M6 76h26M48 76h26" stroke="#e3e6e2" strokeWidth="3.2" />
        <path d="M6 68h26M48 68h26M6 76h26M48 76h26" stroke="#ffffff" strokeWidth="1" opacity=".6" />
        <path fill="#2f3538" d="M14 58h8v6h-8z" />
        <path fill="#f2efe4" d="M58 58h8v5h-8z" />
        {/* Hals och huvud */}
        <path fill={leffe ? '#cc9f78' : '#e0bc9e'} d="M34 47h12v12H34z" />
        <ellipse cx="40" cy="31" rx="18" ry="23" fill={skin} />
        <ellipse cx="22" cy="34" rx="3" ry="6" fill={skin} />
        <ellipse cx="58" cy="34" rx="3" ry="6" fill={skin} />
        {/* Skägg som täcker nedre halva ansiktet och hänger ned över kragen */}
        <path fill={beard} d="M23 36c0 15 6 26 17 26s17-11 17-26c-4 3-6 5-8 8-2 1-4 2-9 2s-7-1-9-2c-2-3-4-5-8-8Z" />
        {leffe ? <>
          <path d="M31 52q2 6 4 8M49 51q-2 5-4 8M40 58v4" stroke="#8b7f76" strokeWidth="1.6" strokeLinecap="round" />
        </> : <>
          <path d="M32 52q2 5 4 7M48 52q-2 5-4 7" stroke="#cbb58c" strokeWidth="1.4" strokeLinecap="round" />
        </>}
        <path fill={beard} d="M31 45q9-4 18 0l-1 4q-8-3-16 0Z" />
        <path d="M36 50q4 2 8 0" stroke={leffe ? '#a56f5c' : '#b98a78'} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {leffe ? <>
          <path fill="#4d4140" d="M21 27c-1-18 9-24 20-24 15 0 21 9 18 24-6-6-9-11-11-16-7 9-17 11-27 16Z" />
          <path d="M24 33h13m6 0h13m-19 0h6" stroke="#4c6059" strokeWidth="2.6" />
          <circle cx="30" cy="34" r="7" fill="none" stroke="#4c6059" strokeWidth="2.5" />
          <circle cx="50" cy="34" r="7" fill="none" stroke="#4c6059" strokeWidth="2.5" />
        </> : <>
          <path fill="#c7b4a2" d="M19 31c1-19 8-26 23-26 14 0 21 9 20 23-6-4-11-9-14-16-6 7-14 12-29 19Z" />
          <path fill="#ddd0bb" d="M21 22c7-20 29-19 38-6-9-3-19 4-25 8l-8 8Z" />
          <path d="m51 14 10 13" stroke="#e7ddce" strokeWidth="4" strokeLinecap="round" />
        </>}
        <path d="M28 36h5m14 0h5" stroke="#3b443e" strokeWidth="2.4" strokeLinecap="round" />
        <path d="m40 37-2 7h4" stroke="#ad8268" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
      <circle cx="40" cy="40" r="39" fill="none" stroke="#fff8e7" strokeOpacity=".7" />
    </svg>
  );
}
