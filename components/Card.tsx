/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { forwardRef, useState, useLayoutEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import type { CardData } from '../data/cards';

interface CardProps {
  card: CardData;
  isDragging: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  eventHandlers: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  }
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ card, isDragging, isFocused, isDimmed, eventHandlers }, ref) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imageRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const hoverAnimationRef = useRef<gsap.core.Tween | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  // This callback will be used to set both our internal ref and the forwarded ref.
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    elRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  useLayoutEffect(() => {
    if (imageStatus === 'loading' && placeholderRef.current) {
      const pulseAnimation = gsap.to(placeholderRef.current, {
        opacity: 0.6, duration: 0.8, repeat: -1, yoyo: true, ease: 'power1.inOut'
      });
      return () => { pulseAnimation.kill(); };
    }
  }, [imageStatus]);

  useLayoutEffect(() => {
    if (!elRef.current) return;
    
    // Animate all properties for the focus/unfocus effect using GSAP.
    gsap.to(elRef.current, {
      scale: isDimmed ? card.position.scale * 0.95 : card.position.scale,
      opacity: isDimmed ? 0.15 : 1,
      filter: isDimmed ? 'saturate(0) blur(2px)' : 'saturate(1) blur(0px)',
      duration: 0.7,
      ease: 'power3.out',
    });
  }, [isDimmed, card.position.scale]);


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
    if (isDragging || isFocused || isDimmed) return;
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
      ref={setRefs}
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