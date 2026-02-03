'use client';

import Image from 'next/image';
import { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  sm: { container: 'w-10 h-10', pixels: 40 },
  md: { container: 'w-12 h-12', pixels: 48 },
  lg: { container: 'w-14 h-14', pixels: 56 },
  xl: { container: 'w-32 h-32 md:w-40 md:h-40', pixels: 160 },
};

export function Avatar({ src, alt, size = 'md', className = '', priority = false }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const { container, pixels } = sizeMap[size];

  // Show fallback if no src or error loading
  if (!src || hasError) {
    return (
      <div className={`${container} bg-cream border-2 border-dark/30 flex items-center justify-center ${className}`}>
        <User className="w-1/2 h-1/2 text-dark/30" />
      </div>
    );
  }

  // Check if it's a Twitter URL
  const isTwitterUrl = src.includes('twimg.com');

  if (isTwitterUrl) {
    return (
      <div className={`relative ${container} ${className}`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${pixels}px`}
          className="object-cover"
          onError={() => setHasError(true)}
          priority={priority}
        />
      </div>
    );
  }

  // For local/other images, use unoptimized or regular img
  return (
    <div className={`relative ${container} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${pixels}px`}
        className="object-cover"
        onError={() => setHasError(true)}
        unoptimized
        priority={priority}
      />
    </div>
  );
}
