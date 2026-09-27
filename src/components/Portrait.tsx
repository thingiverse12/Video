import { useId } from 'react';
import type { Brother } from '../game/types';

export function Portrait({ brother, className = '' }: { brother: Brother; className?: string }) {
  const id = useId();
  const leif = brother === 'leif';
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" role="img" aria-label={leif ? 'Leif med grön keps och grön jacka' : 'Billy med mörk keps och orange väst'}>
      <defs>
        <clipPath id={id}><circle cx="40" cy="40" r="40" /></clipPath>
        <linearGradient id={`${id}-bg`} x1="10" y1="0" x2="65" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor={leif ? '#e4e5c9' : '#f5d8b0'} /><stop offset="1" stopColor={leif ? '#a4bc97' : '#c4b69a'} /></linearGradient>
        <linearGradient id={`${id}-coat`} x1="15" y1="49" x2="60" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor={leif ? '#5b7851' : '#f4a057'} /><stop offset="1" stopColor={leif ? '#2e513e' : '#ca652c'} /></linearGradient>
        <linearGradient id={`${id}-skin`} x1="26" y1="21" x2="53" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor={leif ? '#eac4a0' : '#f4d9be'} /><stop offset="1" stopColor={leif ? '#c89d76' : '#dab59b'} /></linearGradient>
        <linearGradient id={`${id}-cap`} x1="21" y1="4" x2="57" y2="31" gradientUnits="userSpaceOnUse"><stop stopColor={leif ? '#447b5a' : '#49606a'} /><stop offset="1" stopColor={leif ? '#254e3c' : '#273d48'} /></linearGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path fill={`url(#${id}-bg)`} d="M0 0h80v80H0z" />
        <path fill={`url(#${id}-coat)`} d="M6 84V66c0-12 16-17 34-17s34 5 34 17v18H6Z" />
        <path fill={leif ? '#6c5941' : '#a2ad9a'} d="m30 51 10 9 10-9 5 33H25l5-33Z" />
        <path stroke={leif ? '#434731' : '#637765'} strokeWidth="2" opacity=".6" d="M30 64h20M29 70h23M27 76h25M34 58v24M42 62v20M48 60v22" />
        <path fill={leif ? '#b79865' : '#f0a155'} d="m30 49-13 8 10 14 8-13-5-9ZM50 49l13 8-10 14-8-13 5-9Z" />
        <path fill="#ce9e78" d="M33 46h14v12l-7 6-7-6V46Z" />
        <ellipse cx="22" cy="34" rx="4" ry="7" fill="#d7ad85" />
        <ellipse cx="58" cy="34" rx="4" ry="7" fill="#d7ad85" />
        <path fill={`url(#${id}-skin)`} d="M22 25c0-11 8-17 18-17s18 6 18 17v15c0 13-11 19-18 19S22 53 22 40V25Z" />
        {leif && <path fill="#775c40" d="m22 36 7 10 11 3 11-3 7-10v9c-1 9-10 16-18 16S23 54 22 45v-9Z" />}
        <path fill="#deab7f" d="m40 33-3 10h7l-4-10Z" />
        <path stroke={leif ? '#665036' : '#9b7950'} strokeWidth="2" strokeLinecap="round" d="m28 31 6-1m12 0 6 1" />
        <ellipse cx="31" cy="35.2" rx="3" ry="2.4" fill="#f9f0dd" /><ellipse cx="49" cy="35.2" rx="3" ry="2.4" fill="#f9f0dd" />
        <circle cx="31.2" cy="35.4" r="1.5" fill="#3c594d" /><circle cx="48.8" cy="35.4" r="1.5" fill="#3c594d" />
        <circle cx="31.7" cy="34.7" r=".55" fill="#fff9e7" /><circle cx="49.3" cy="34.7" r=".55" fill="#fff9e7" />
        <path d="M25 42c2 1 3 1 5 0M50 42c2 1 3 1 5 0" stroke="#bd8870" strokeWidth=".8" opacity=".4" />
        <path stroke={leif ? '#dcb18a' : '#9d6d51'} strokeWidth="2" strokeLinecap="round" d={leif ? 'M35 48h10' : 'm35 47 5 2 5-2'} />
        <path fill={`url(#${id}-cap)`} d="M20 25C19 10 28 4 39 4c13 0 22 9 21 23l-40-2Z" />
        <path fill={leif ? '#e2a84f' : '#a77462'} d="M19 22c13 4 26 4 41 1l5 7c-18 3-35 1-46-4v-4Z" />
        <path fill={leif ? '#436f57' : '#354346'} d="M19 22c13 4 26 4 41 1l6 5c-18 3-35 1-47-4v-2Z" />
        <path stroke={leif ? '#7f9c6e' : '#798177'} opacity=".65" d="M38 6c-6 6-8 13-7 18m9-18c5 7 7 13 6 18" />
        {!leif && <><path stroke="#ae847b" strokeWidth="1.5" d="m35 15 5-2 6 3m-11 2 10 1" /><circle cx="59" cy="69" r="4" fill="#efe1b3" /><path d="m58 67 2 4m0-4-2 4" stroke="#58645c" /></>}
        <path d="M16 69v10m48-10v10M15 74h9m32 0h9" stroke="#faebc4" strokeWidth=".8" opacity=".45" />
      </g>
      <circle cx="40" cy="40" r="39.5" stroke="#faf2dc" strokeOpacity=".45" />
    </svg>
  );
}
