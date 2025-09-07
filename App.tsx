/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef } from 'react';
import { ParallaxLayer } from './components/ParallaxLayer';
import { useParallax } from './hooks/useParallax';
import { CARD_DATA } from './data/cards';
import { config } from './config/parallax';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { getCardEventHandlers, setFocusedCard, focusedCard } = useParallax(containerRef, layerRefs, sceneRef, cardRefs);

  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If the user clicks on the container itself (the background), unfocus any card.
    if (e.target === e.currentTarget) {
        setFocusedCard(null);
    }
  };

  return (
    <div 
      className="parallax-container"
      ref={containerRef}
      onPointerDown={handleBackgroundPointerDown}
      role="application" 
      aria-label="Interactive Parallax Directory"
    >
      <div className="parallax-scene" ref={sceneRef}>
        {config.layers.map((layer, i) => (
          <ParallaxLayer
            key={i}
            ref={el => { layerRefs.current[i] = el; }}
            className={layer.className}
            cards={CARD_DATA.filter(card => card.layer === i)}
            cardRefs={cardRefs}
            getCardEventHandlers={getCardEventHandlers}
            focusedCard={focusedCard}
          />
        ))}
      </div>
    </div>
  );
}