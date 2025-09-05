/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef, useState } from 'react';
import { ParallaxLayer } from './components/ParallaxLayer';
import { useParallax } from './hooks/useParallax';
import { CARD_DATA } from './data/cards';
import { config } from './config/parallax';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useParallax(containerRef, layerRefs, zoomWrapperRef);

  return (
    <div 
      className={`parallax-container ${isFocused ? 'is-focused' : ''}`} 
      ref={containerRef} 
      role="application" 
      aria-label="Interactive Parallax Directory"
    >
      <div ref={zoomWrapperRef}>
        {config.layers.map((layer, i) => (
          <ParallaxLayer
            key={i}
            ref={el => { layerRefs.current[i] = el; }}
            className={layer.className}
            cards={CARD_DATA.filter(card => card.layer === i)}
            setIsFocused={setIsFocused}
          />
        ))}
      </div>
    </div>
  );
}