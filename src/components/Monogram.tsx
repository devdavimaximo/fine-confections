import type { CSSProperties } from 'react';

const url = `${import.meta.env.BASE_URL}media/monogram.png`;

/** monograma demonstrativo SA (scripts/monogram.mjs), usado como máscara: pega a cor do texto */
export default function Monogram({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`mono ${className}`}
      aria-hidden="true"
      style={{ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, ...style }}
    />
  );
}
