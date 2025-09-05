/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { forwardRef } from 'react';
import { Card } from './Card';
import type { CardData } from '../data/cards';
import { config } from '../config/parallax';

interface ParallaxLayerProps {
  className: string;
  cards: CardData[];
  setIsFocused: (isFocused: boolean) => void;
}

// Defines a 3x3 grid for tiling, including the center tile
const TILE_OFFSETS = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
  { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 },
  { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

export const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
  ({ className, cards, setIsFocused }, ref) => {
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
              // Use a unique key for each card instance across all tiles
              <Card key={`${card.id}-${i}`} card={card} setIsFocused={setIsFocused} />
            ))}
          </div>
        ))}
      </div>
    );
  }
);