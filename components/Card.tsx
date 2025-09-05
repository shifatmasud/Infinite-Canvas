/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { CSSProperties } from 'react';
import type { CardData } from '../data/cards';

interface CardProps {
  card: CardData;
  setIsFocused: (isFocused: boolean) => void;
}

export function Card({ card, setIsFocused }: CardProps) {
  return (
    <div
      key={card.id}
      className="card"
      style={{
        left: `${card.position.x}px`,
        top: `${card.position.y}px`,
        width: `${card.position.width}px`,
        '--transform': `translateZ(${card.position.z}px) scale(${card.position.scale})`
      } as CSSProperties}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
    >
      <div className="card-header">
        <span className="card-title">{card.title}</span>
        <span className="card-meta">{card.meta}</span>
      </div>
      <img src={card.image} alt={card.title} className="card-image" loading="lazy" />
    </div>
  );
}