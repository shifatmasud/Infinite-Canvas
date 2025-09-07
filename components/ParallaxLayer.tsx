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
  getCardEventHandlers: (card: CardData, tileIndex: number) => {
    isDragging: boolean;
    eventHandlers: {
        onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    };
  };
  focusedCard: { id: string | null; tileIndex: number | null };
}

export const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
  ({ className, cards, cardRefs, getCardEventHandlers, focusedCard }, ref) => {
    return (
      <div className={`parallax-layer ${className}`} ref={ref}>
        {TILE_OFFSETS.map((offset, i) => (
          <div
            key={i}
            className="parallax-tile"
            style={{
              transform: `translate(${offset.x * config.baseWorldWidth}px, ${offset.y * config.baseWorldHeight}px)`
            }}
          >
            {cards.map(card => {
              const { isDragging, eventHandlers } = getCardEventHandlers(card, i);
              const isFocused = card.id === focusedCard.id && i === focusedCard.tileIndex;
              return (
                <Card 
                  key={`${card.id}-${i}`} 
                  card={card}
                  ref={(el: HTMLDivElement | null) => {
                    if (cardRefs.current) {
                      cardRefs.current[`${card.id}-${i}`] = el;
                    }
                  }}
                  isDragging={isDragging}
                  isFocused={isFocused}
                  eventHandlers={eventHandlers}
                />
              )
            })}
          </div>
        ))}
      </div>
    );
  }
);