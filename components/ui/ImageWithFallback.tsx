'use client';
import { useState } from 'react';

export default function ImageWithFallback({ src, fallbackSrc, alt, ...rest }: any) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <img
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={(e) => {
        console.log('onError triggered');
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}