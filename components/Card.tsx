/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { CSSProperties, forwardRef, useState } from 'react';
import type { CardData } from '../data/cards';

interface CardProps {
  card: CardData;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ card }, ref) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const handleImageLoad = () => {
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    setImageStatus('error');
  };

  return (
    <div
      key={card.id}
      className="card"
      ref={ref}
      style={{
        left: `${card.position.x}px`,
        top: `${card.position.y}px`,
        width: `${card.position.width}px`,
        '--transform': `translateZ(${card.position.z}px) scale(${card.position.scale})`
      } as CSSProperties}
    >
      <div className="card-header">
        <span className="card-title">{card.title}</span>
        <span className="card-meta">{card.meta}</span>
      </div>
      <div className="card-image-wrapper">
        {imageStatus === 'loading' && <div className="card-image-placeholder" />}
        {imageStatus === 'error' && (
          <div className="card-image-error">
            <span>Image not available</span>
          </div>
        )}
        <img
          src={card.image}
          alt={card.title}
          className={`card-image ${imageStatus === 'loaded' ? 'loaded' : ''}`}
          loading="lazy"
          draggable={false}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    </div>
  );
});
