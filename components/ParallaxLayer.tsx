/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { forwardRef, RefObject } from 'react';
import { Card } from './Card';
import type { CardData } from '../data/cards';
import { config, TILE_OFFSETS } from '../config/parallax';

interface ParallaxLayerProps {
  className: string;
  cards: CardData[];
  cardRefs: RefObject<{ [key: string]: HTMLDivElement | null }>;
}

export const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
  ({ className, cards, cardRefs }, ref) => {
    return (
      <div className={`parallax-layer ${className}`} ref={ref}>
        {TILE_OFFSETS.map((offset, i) => (
          <div
            key={i}
            className="parallax-tile"
            style={{
              transform: `translate(${offset.x * config.worldWidth}px, ${offset.y * config.worldHeight}px)`
            }}
          >
            {cards.map(card => (
              <Card 
                key={`${card.id}-${i}`} 
                card={card}
                ref={(el: HTMLDivElement | null) => {
                  if (cardRefs.current) {
                    cardRefs.current[`${card.id}-${i}`] = el;
                  }
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);