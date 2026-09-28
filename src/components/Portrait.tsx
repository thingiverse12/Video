import { useId } from 'react';
import type { Brother } from '../game/types';

/** Original illustrated portraits that match the new game outfits, not a photograph. */
export function Portrait({ brother, className = '' }: { brother: Brother; className?: string }) {
  const id = useId();
  const nils = brother === 'nils';
  return (
    <svg className={className} viewBox="0 0 80 80" role="img" aria-label={nils ? 'Nils i turkos regnjacka och gul halsduk' : 'Ebbe i lila huvtröja med ljust hår'}>
      <defs>
        <clipPath id={id}><circle cx="40" cy="40" r="39" /></clipPath>
        <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor={nils ? '#d8e7da' : '#e5d9ec'} /><stop offset="1" stopColor={nils ? '#89ac9b' : '#a8a0ca'} /></linearGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path fill={`url(#${id}-bg)`} d="M0 0h80v80H0z" />
        <circle cx="62" cy="16" r="12" fill="#fff8d5" opacity=".4" />
        <path fill={nils ? '#266c78' : '#715788'} d="M4 81V67c0-12 15-19 36-19s36 7 36 19v14H4Z" />
        {nils ? <>
          <path fill="#1c5360" d="m18 57 9-8 9 23-12 9h-8l2-24Zm44 0-9-8-9 23 12 9h8l-2-24Z" />
          <path fill="#e9c26d" d="m35 49 5 11 5-11 5 9-7 23h-8l-6-23 6-9Z" />
        </> : <>
          <path d="M15 65c1-11 8-17 16-19l4 9h10l4-9c8 2 15 8 16 19" stroke="#a58abe" strokeWidth="5" fill="none" />
          <path fill="#5b4774" d="M26 69q14-8 28 0v12H26V69Z" />
          <path d="M37 54v12m6-12v12" stroke="#e2d1aa" strokeWidth="2" />
        </>}
        <path fill={nils ? '#cc9f78' : '#e0bc9e'} d="M34 47h12v12H34z" />
        <ellipse cx="40" cy="31" rx="18" ry="23" fill={nils ? '#d9b08b' : '#ebc8ab'} />
        <ellipse cx="22" cy="34" rx="3" ry="6" fill={nils ? '#d9b08b' : '#ebc8ab'} />
        <ellipse cx="58" cy="34" rx="3" ry="6" fill={nils ? '#d9b08b' : '#ebc8ab'} />
        {nils ? <>
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
        <path d="M35 49q5 4 10 0" stroke="#805a4e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {nils && <path d="M24 66h11m10 0h11" stroke="#d6a754" strokeWidth="1.6" />}
      </g>
      <circle cx="40" cy="40" r="39" fill="none" stroke="#fff8e7" strokeOpacity=".7" />
    </svg>
  );
}
