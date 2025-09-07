/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { forwardRef, useState, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { CardData } from '../data/cards';

interface CardProps {
  card: CardData;
  isDragging: boolean;
  isFocused: boolean;
  eventHandlers: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  }
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ card, isDragging, isFocused, eventHandlers }, ref) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imageRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const hoverAnimationRef = useRef<gsap.core.Tween | null>(null);

  useLayoutEffect(() => {
    if (imageStatus === 'loading' && placeholderRef.current) {
      const pulseAnimation = gsap.to(placeholderRef.current, {
        opacity: 0.6, duration: 0.8, repeat: -1, yoyo: true, ease: 'power1.inOut'
      });
      return () => { pulseAnimation.kill(); };
    }
  }, [imageStatus]);

  const handleImageLoad = () => {
    setImageStatus('loaded');
    if (imageRef.current) {
      gsap.to(imageRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  };

  const handleImageError = () => {
    setImageStatus('error');
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging || isFocused) return;
    if (hoverAnimationRef.current) hoverAnimationRef.current.kill();
    hoverAnimationRef.current = gsap.to(e.currentTarget, {
      scale: card.position.scale * 1.05,
      duration: 0.5,
      ease: 'power3.out',
    });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    // Reset hover scale if not dragging and not focused
    if (!isDragging && !isFocused) {
        if (hoverAnimationRef.current) hoverAnimationRef.current.kill();
        hoverAnimationRef.current = gsap.to(e.currentTarget, {
            scale: card.position.scale,
            duration: 0.5,
            ease: 'power3.out',
        });
    }
  };

  return (
    <div
      className="card"
      ref={ref}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={eventHandlers.onPointerDown}
      style={{ touchAction: 'none' }} // Required for pointer events
    >
      <div className="card-header">
        <span className="card-title">{card.title}</span>
        <span className="card-meta">{card.meta}</span>
      </div>
      <div className="card-image-wrapper">
        {imageStatus === 'loading' && <div className="card-image-placeholder" ref={placeholderRef} />}
        {imageStatus === 'error' && (
          <div className="card-image-error"><span>Image not available</span></div>
        )}
        <img
          ref={imageRef} src={card.image} alt={card.title} className="card-image"
          loading="lazy" draggable={false} onLoad={handleImageLoad} onError={handleImageError}
        />
      </div>
    </div>
  );
});