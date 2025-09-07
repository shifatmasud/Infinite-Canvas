/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef, forwardRef, RefObject, useLayoutEffect, useState, useCallback, useEffect, ForwardedRef } from 'react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

// ================================================================================================
// STYLES
// All CSS is injected via this component to make the canvas self-contained.
// ================================================================================================

const STYLES = `
:root {
  --bg-color: #f8f8f8;
}

* {
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: var(--bg-color);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
}

.parallax-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  perspective: 1000px; /* Enable 3D space */
  -webkit-user-select: none; /* Safari */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* IE10+/Edge */
  user-select: none; /* Standard */
}

.parallax-container:active {
  cursor: grabbing;
}

.parallax-scene {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.parallax-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  transform-style: preserve-3d; /* Allow 3D positioning of children */
}

.parallax-tile {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.card {
    position: absolute;
    background: #ffffff;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    will-change: transform, opacity, filter;
    box-shadow: 0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08);
    filter: saturate(1) blur(0px);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #555;
    background-color: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid #f0f0f0;
    white-space: nowrap;
}

.card-title {
    font-weight: 600;
}

.card-meta {
    color: #999;
}

.card-image-wrapper {
    position: relative;
    width: 100%;
    flex-grow: 1; 
    background-color: #f0f2f5;
    overflow: hidden;
}

.card-image-placeholder,
.card-image-error {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.card-image-placeholder {
    background-color: #e9ecef;
}

.card-image-error {
    background-color: #fafafa;
    color: #999;
    font-size: 13px;
    text-align: center;
}

.card-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    opacity: 0;
}
`;

const StyleInjector = () => <style>{STYLES}</style>;

// ================================================================================================
// DATA & TYPES
// (from data/cards.ts)
// ================================================================================================

interface CardPosition {
  x: number;
  y: number;
  scale: number;
  width: number;
}

interface CardData {
  id: string;
  layer: number;
  image: string;
  title: string;
  meta: string;
  position: CardPosition;
}

const CARD_DATA: CardData[] = [
  // Near Layer (layer: 2) - Most prominent
  { id: 'c1', layer: 2, image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', title: 'Abstract Forms', meta: 'Daniel Bornmann', position: { x: 150, y: -50, scale: 1.3, width: 400 } },
  { id: 'c3', layer: 2, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=80', title: 'Porcelain', meta: 'Adebayo Oyelawal', position: { x: -350, y: 250, scale: 1, width: 280 } },
  { id: 'c6', layer: 2, image: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=500&q=80', title: 'Monochrome', meta: 'Antonio Diacosia', position: { x: 550, y: 300, scale: 1, width: 250 } },
  { id: 'c9', layer: 2, image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=500&q=80', title: 'The Classics', meta: 'Natasha Jen', position: { x: -500, y: -400, scale: 0.8, width: 300 } },
  { id: 'c12', layer: 2, image: 'https://images.unsplash.com/photo-1506782081999-1139f8b45f09?w=500&q=80', title: 'Textured', meta: 'Rosella Mei', position: { x: 800, y: 550, scale: 0.9, width: 280 } },
  { id: 'c15', layer: 2, image: 'https://images.unsplash.com/photo-1487744479979-628f11409f52?w=500&q=80', title: 'Concrete Jungle', meta: 'Maxime Lebrun', position: { x: -800, y: 100, scale: 1, width: 320 } },
  { id: 'c17', layer: 2, image: 'https://images.unsplash.com/photo-1561729653-7313a07297a4?w=500&q=80', title: 'Iridescent', meta: 'FlyD', position: { x: 600, y: -300, scale: 1.1, width: 350 } },
  { id: 'c20', layer: 2, image: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=500&q=80', title: 'Powder Burst', meta: 'Dawid Zawiła', position: { x: 20, y: 400, scale: 1.25, width: 380 } },
  { id: 'c21', layer: 2, image: 'https://images.unsplash.com/photo-1572099606223-6e29712e5de4?w=500&q=80', title: 'Paper Cut', meta: 'Jr Korpa', position: { x: 1000, y: 200, scale: 1, width: 300 } },
  { id: 'c22', layer: 2, image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=500&q=80', title: 'Ink Wash', meta: 'Efe Kurnaz', position: { x: -1100, y: -250, scale: 1.2, width: 380 } },
  { id: 'c2', layer: 1, image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&q=80', title: 'Organized Chaos', meta: 'Eva Tuer', position: { x: 400, y: 450, scale: 1.1, width: 350 } },
  { id: 'c5', layer: 1, image: 'https://images.unsplash.com/photo-1557853194-27237a3c334b?w=500&q=80', title: 'Retrograde', meta: 'Kappa', position: { x: -100, y: 700, scale: 0.9, width: 320 } },
  { id: 'c8', layer: 1, image: 'https://images.unsplash.com/photo-1604537525944-a6a132d137f1?w=500&q=80', title: 'Serenity', meta: 'Annu Kilpeläinen', position: { x: -600, y: 500, scale: 1.2, width: 420 } },
  { id: 'c11', layer: 1, image: 'https://images.unsplash.com/photo-1512428209245-56b9a80544f3?w=500&q=80', title: 'Architecture', meta: 'Ben Denzer', position: { x: 800, y: 100, scale: 1.1, width: 360 } },
  { id: 'c13', layer: 1, image: 'https://images.unsplash.com/photo-1531978224329-a10a5afd5218?w=500&q=80', title: 'Perspective', meta: 'Robert Caranito', position: { x: 1000, y: -200, scale: 1.2, width: 400 } },
  { id: 'c16', layer: 1, image: 'https://images.unsplash.com/photo-1618331835718-fa4222a5e2b9?w=500&q=80', title: 'Sculpted Mind', meta: 'Milad Fakurian', position: { x: 300, y: 800, scale: 0.9, width: 280 } },
  { id: 'c19', layer: 1, image: 'https://images.unsplash.com/photo-1526045612-6113b5951356?w=500&q=80', title: 'Simplicity', meta: 'J. Balla Photos', position: { x: 1100, y: 400, scale: 1, width: 300 } },
  { id: 'c23', layer: 1, image: 'https://images.unsplash.com/photo-153312132-29859c638640?w=500&q=80', title: 'Neon Dream', meta: 'Evol Lee', position: { x: -900, y: 800, scale: 1.1, width: 340 } },
  { id: 'c24', layer: 1, image: 'https://images.unsplash.com/photo-1525338078359-6c3571814b6a?w=500&q=80', title: 'Floral', meta: 'Kari Shea', position: { x: 1300, y: 700, scale: 1, width: 300 } },
  { id: 'c25', layer: 1, image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&q=80', title: 'Workspace', meta: 'Dmitri Popov', position: { x: 0, y: -500, scale: 1.3, width: 450 } },
  { id: 'c18', layer: 1, image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&q=80', title: 'Street Style', meta: 'Laura Chouette', position: { x: -1000, y: -100, scale: 1.2, width: 420 } },
  { id: 'c26', layer: 1, image: 'https://images.unsplash.com/photo-1504208434309-cb69f4c42448?w=500&q=80', title: 'Gradient', meta: 'Joel Filipe', position: { x: 1500, y: 500, scale: 1.3, width: 500 } },
  { id: 'c27', layer: 1, image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=500&q=80', title: 'Geometric', meta: 'Ricardo Gomez Angel', position: { x: -1400, y: 400, scale: 1.2, width: 450 } },
  { id: 'c28', layer: 1, image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&q=80', title: 'Fabric', meta: 'engin akyurt', position: { x: 400, y: 1100, scale: 1, width: 350 } },
  { id: 'c29', layer: 1, image: 'https://images.unsplash.com/photo-1562043236-559c3b65a6e2?w=500&q=80', title: 'Holographic', meta: 'gradienta', position: { x: -1200, y: -900, scale: 1.1, width: 400 } },
  { id: 'c4', layer: 0, image: 'https://images.unsplash.com/photo-1549492423-400254a408a8?w=500&q=80', title: 'Pastel Dreams', meta: 'Heather Chambers', position: { x: 700, y: -500, scale: 1.2, width: 450 } },
  { id: 'c7', layer: 0, image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', title: 'Color Splash', meta: 'Simon', position: { x: -700, y: 800, scale: 1, width: 380 } },
  { id: 'c10', layer: 0, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=80', title: 'Bloom', meta: 'Florence Okoye', position: { x: 100, y: -700, scale: 1, width: 330 } },
  { id: 'c14', layer: 0, image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=500&q=80', title: 'Cosmic Swirl', meta: 'NASA', position: { x: 1300, y: -400, scale: 1.1, width: 400 } },
  { id: 'c30', layer: 0, image: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=500&q=80', title: 'Glow', meta: 'Billy Huynh', position: { x: 1600, y: -800, scale: 1.2, width: 420 } },
];

// ================================================================================================
// CONFIGURATION
// (from config/parallax.ts)
// ================================================================================================

interface LayerConfig {
  speed: number;
  baseZ: number;
  className: string;
}

interface ParallaxConfig {
  layers: LayerConfig[];
  scrollSpeed: number;
  baseWorldWidth: number;
  baseWorldHeight: number;
}

const generateTileOffsets = (size: number): { x: number; y: number }[] => {
  if (size % 2 === 0) {
    console.warn("Tile offset grid size should be an odd number for a central tile.");
  }
  const offsets: { x: number; y: number }[] = [];
  const half = Math.floor(size / 2);
  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      offsets.push({ x, y });
    }
  }
  return offsets;
};

const TILE_OFFSETS = generateTileOffsets(5);

const config: ParallaxConfig = {
  layers: [
    { speed: 0.3, baseZ: -600, className: 'layer-far' },
    { speed: 0.6, baseZ: -300, className: 'layer-mid' },
    { speed: 1.0, baseZ: 0, className: 'layer-near' },
  ],
  scrollSpeed: 1,
  baseWorldWidth: 4000,
  baseWorldHeight: 4000,
};

// ================================================================================================
// INTERACTION ENGINE
// (from engine/interaction.ts)
// ================================================================================================
gsap.registerPlugin(Observer);

interface InteractionCallbacks {
  onDrag: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onWheelPan: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onZoom: ({ deltaY, event }: { deltaY: number; event: WheelEvent; }) => void;
}

interface InteractionEngine {
  kill: () => void;
  enable: () => void;
  disable: () => void;
}

function createInteractionEngine(
  target: HTMLElement,
  callbacks: InteractionCallbacks
): InteractionEngine {
  const observer = Observer.create({
    target,
    type: 'wheel,touch,pointer',
    dragMinimum: 2,
    onDrag: self => {
      callbacks.onDrag({ deltaX: -self.deltaX, deltaY: -self.deltaY });
    },
    onWheel: self => {
      const wheelEvent = self.event as WheelEvent;
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        callbacks.onZoom({ deltaY: self.deltaY, event: wheelEvent });
      } else {
        callbacks.onWheelPan({ deltaX: -self.deltaX, deltaY: -self.deltaY });
      }
    },
    preventDefault: true,
  });

  return {
    kill: () => observer.kill(),
    enable: () => observer.enable(),
    disable: () => observer.disable(),
  };
}

// ================================================================================================
// REACT COMPONENTS
// (from components/Card.tsx and components/ParallaxLayer.tsx)
// ================================================================================================

interface CardProps {
  card: CardData;
  isDragging: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  eventHandlers: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  }
}

const Card = forwardRef<HTMLDivElement, CardProps>(({ card, isDragging, isFocused, isDimmed, eventHandlers }, ref) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imageRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const hoverAnimationRef = useRef<gsap.core.Tween | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

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
      style={{ touchAction: 'none' }}
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
  focusedCardId: string | null;
}

const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
  ({ className, cards, cardRefs, getCardEventHandlers, focusedCardId }, ref) => {
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
              const isFocused = card.id === focusedCardId;
              const isDimmed = focusedCardId !== null && !isFocused;

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
                  isDimmed={isDimmed}
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

// ================================================================================================
// PARALLAX HOOK
// (from hooks/useParallax.ts)
// ================================================================================================
type InteractionMode = 'IDLE' | 'PANNING' | 'DRAGGING_CARD';

interface InteractionState {
  mode: InteractionMode;
  cardId: string | null;
  tileIndex: number | null;
  pointerStart: { x: number; y: number; };
  dragStartDelta: { x: number; y: number; };
  liveDelta: { x: number; y: number; };
}

function useParallax(
  containerRef: RefObject<HTMLDivElement>,
  layerRefs: RefObject<(HTMLDivElement | null)[]>,
  sceneRef: RefObject<HTMLDivElement>,
  cardRefs: RefObject<{ [key: string]: HTMLDivElement | null }>
) {
  const panPosition = useRef({ x: 0, y: 0 });
  const panVelocity = useRef({ x: 0, y: 0 });
  const cameraZ = useRef(0);
  const targetCameraZ = useRef(0);
  const zoomVelocity = useRef(0);
  const worldSize = useRef({ width: config.baseWorldWidth, height: config.baseWorldHeight });
  const viewportSize = useRef({ width: 0, height: 0 });
  
  const draggedCardDeltas = useRef<{ [key: string]: { x: number; y: number } }>({});
  
  const interactionState = useRef<InteractionState>({
    mode: 'IDLE',
    cardId: null,
    tileIndex: null,
    pointerStart: { x: 0, y: 0 },
    dragStartDelta: { x: 0, y: 0 },
    liveDelta: { x: 0, y: 0 },
  });

  const [interactionEngine, setInteractionEngine] = useState<InteractionEngine | null>(null);
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const lastDraggedCardId = useRef<string | null>(null);
  
  const [focusedCard, setFocusedCardState] = useState<{ id: string | null; tileIndex: number | null }>({ id: null, tileIndex: null });
  const focusedCardRef = useRef<{ id: string | null; tileIndex: number | null }>({ id: null, tileIndex: null });

  const setFocusedCard = useCallback((id: string | null, tileIndex: number | null = null) => {
    const newFocusState = { id, tileIndex };
    focusedCardRef.current = newFocusState;
    setFocusedCardState(newFocusState);
  }, []);

  const getEffectiveScale = useCallback(() => {
    const PERSPECTIVE = 1000;
    const safeCameraZ = Math.min(cameraZ.current, PERSPECTIVE - 1);
    return PERSPECTIVE / (PERSPECTIVE - safeCameraZ);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (interactionState.current.mode !== 'DRAGGING_CARD') return;
    const { pointerStart } = interactionState.current;
    const effectiveScale = getEffectiveScale();

    interactionState.current.liveDelta = {
      x: (event.clientX - pointerStart.x) / effectiveScale,
      y: (event.clientY - pointerStart.y) / effectiveScale,
    };
  }, [getEffectiveScale]);
  
  const handlePointerUp = useCallback(() => {
    if (interactionState.current.mode !== 'DRAGGING_CARD') return;
    
    const { cardId, tileIndex, dragStartDelta, liveDelta } = interactionState.current;
    
    const distance = Math.hypot(liveDelta.x, liveDelta.y);
    const isClick = distance < 5;

    if (cardId) {
      lastDraggedCardId.current = cardId;
      if (tileIndex !== null) {
        if (isClick) {
          const { id: currentFocusedId } = focusedCardRef.current;
          if (currentFocusedId === null) {
            setFocusedCard(cardId, tileIndex);
          } else {
            setFocusedCard(null);
          }
        } else {
          draggedCardDeltas.current[cardId] = {
            x: dragStartDelta.x + liveDelta.x,
            y: dragStartDelta.y + liveDelta.y,
          };
          setFocusedCard(null);
        }
      }
    }
    
    interactionState.current = { ...interactionState.current, mode: 'IDLE', cardId: null, tileIndex: null, liveDelta: {x: 0, y: 0} };
    setActiveDragCardId(null);

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, setFocusedCard]);

  const handlePointerDown = useCallback((card: CardData, tileIndex: number, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    interactionState.current = {
      mode: 'DRAGGING_CARD',
      cardId: card.id,
      tileIndex,
      pointerStart: { x: event.clientX, y: event.clientY },
      dragStartDelta: draggedCardDeltas.current[card.id] || { x: 0, y: 0 },
      liveDelta: { x: 0, y: 0 }
    };
    setActiveDragCardId(card.id);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  const getCardEventHandlers = useCallback((card: CardData, tileIndex: number) => ({
      isDragging: card.id === activeDragCardId,
      eventHandlers: {
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => handlePointerDown(card, tileIndex, e),
      }
  }), [activeDragCardId, handlePointerDown]);


  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scene = sceneRef.current;
    if (!scene) return;
    
    let layoutScaleFactor = 1;

    const updateLayout = () => {
      viewportSize.current = { width: container.clientWidth, height: container.clientHeight };
      const WORLD_SCALE_FACTOR = 3;
      const newWorldWidth = viewportSize.current.width * WORLD_SCALE_FACTOR;
      layoutScaleFactor = newWorldWidth / config.baseWorldWidth;
      const newWorldHeight = config.baseWorldHeight * layoutScaleFactor;
      
      worldSize.current = { width: newWorldWidth, height: newWorldHeight };
      const allCards = cardRefs.current;
      if (!allCards) return;

      layerRefs.current?.forEach(layer => {
        if (!layer) return;
        const tiles = layer.querySelectorAll<HTMLDivElement>('.parallax-tile');
        tiles.forEach((tile, i) => {
          const offset = TILE_OFFSETS[i];
          gsap.set(tile, { transform: `translate(${offset.x * newWorldWidth}px, ${offset.y * newWorldHeight}px)` });
        });
      });

      CARD_DATA.forEach(card => {
        const draggedDelta = draggedCardDeltas.current[card.id] || { x: 0, y: 0 };
        const initialX = (newWorldWidth / 2) + (card.position.x * layoutScaleFactor);
        const initialY = (newWorldHeight / 2) + (card.position.y * layoutScaleFactor);

        TILE_OFFSETS.forEach((_, tileIndex) => {
          const cardKey = `${card.id}-${tileIndex}`;
          const cardElement = allCards[cardKey];
          if (cardElement) {
            gsap.set(cardElement, {
              x: initialX + draggedDelta.x,
              y: initialY + draggedDelta.y,
              width: card.position.width * layoutScaleFactor,
              height: card.position.width * layoutScaleFactor * 1.25,
              scale: card.position.scale,
              z: 0,
              boxShadow: '0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08)',
            });
          }
        });
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();
    
    const engine = createInteractionEngine(container, {
      onDrag: ({ deltaX, deltaY }) => {
        if (interactionState.current.mode !== 'IDLE') return;
        const speed = config.scrollSpeed;
        const effectiveScale = getEffectiveScale();
        panVelocity.current.x -= (deltaX * speed) / effectiveScale;
        panVelocity.current.y -= (deltaY * speed) / effectiveScale;
      },
      onWheelPan: ({ deltaX, deltaY }) => {
        const speed = config.scrollSpeed;
        const effectiveScale = getEffectiveScale();
        panVelocity.current.x += (deltaX * speed) / effectiveScale;
        panVelocity.current.y += (deltaY * speed) / effectiveScale;
      },
      onZoom: ({ deltaY, event }) => {
        const ZOOM_SPEED_MULTIPLIER = 5;
        const ANTICIPATION_AMOUNT = 30;
        const oldTargetZ = targetCameraZ.current;
        const newTargetZ = oldTargetZ + (deltaY > 0 ? -ANTICIPATION_AMOUNT : ANTICIPATION_AMOUNT);
        const PERSPECTIVE = 1000;
        let refLayerIndex = 1; 
        const { id: currentFocusedId } = focusedCardRef.current;
        if (currentFocusedId) {
            const card = CARD_DATA.find(c => c.id === currentFocusedId);
            if (card) {
                refLayerIndex = card.layer;
            }
        }
        const { speed, baseZ } = config.layers[refLayerIndex];
        const Z_old = baseZ + oldTargetZ;
        const Z_new = baseZ + newTargetZ;
        if (PERSPECTIVE - Z_old === 0 || PERSPECTIVE - Z_new === 0) return;
        const scale_ratio = (PERSPECTIVE - Z_old) / (PERSPECTIVE - Z_new);
        const mx = event.clientX;
        const my = event.clientY;
        const cx = viewportSize.current.width / 2;
        const cy = viewportSize.current.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const screen_shift_x = dx * (scale_ratio - 1);
        const screen_shift_y = dy * (scale_ratio - 1);
        const new_scale = PERSPECTIVE / (PERSPECTIVE - Z_new);
        if (speed === 0 || new_scale === 0) return;
        const pan_impulse_x = -screen_shift_x / (speed * new_scale);
        const pan_impulse_y = -screen_shift_y / (speed * new_scale);
        panVelocity.current.x += pan_impulse_x;
        panVelocity.current.y += pan_impulse_y;
        targetCameraZ.current = newTargetZ;
        zoomVelocity.current -= deltaY * ZOOM_SPEED_MULTIPLIER;
      },
    });
    setInteractionEngine(engine);

    const ticker = gsap.ticker.add(() => {
      const layerElements = layerRefs.current?.filter(el => el !== null) as HTMLDivElement[] | undefined;
      if (!layerElements || !scene) return;

      const LERP_FACTOR_FOCUS = 0.08;
      const LERP_FACTOR_FREE = 0.1;
      const PAN_DAMPING_FACTOR = 0.90;
      const ZOOM_DAMPING_FACTOR = 0.88;
      const MIN_CAMERA_Z = -4000;
      const MAX_CAMERA_Z = 750;

      targetCameraZ.current += zoomVelocity.current;
      targetCameraZ.current = gsap.utils.clamp(MIN_CAMERA_Z, MAX_CAMERA_Z, targetCameraZ.current);
      zoomVelocity.current *= ZOOM_DAMPING_FACTOR;
      cameraZ.current += (targetCameraZ.current - cameraZ.current) * LERP_FACTOR_FREE;

      panPosition.current.x += panVelocity.current.x;
      panPosition.current.y += panVelocity.current.y;
      panVelocity.current.x *= PAN_DAMPING_FACTOR;
      panVelocity.current.y *= PAN_DAMPING_FACTOR;

      const { id: currentFocusedId, tileIndex: currentFocusedTileIndex } = focusedCardRef.current;

      if (currentFocusedId && currentFocusedTileIndex !== null) {
        const card = CARD_DATA.find(c => c.id === currentFocusedId);
        const tileIndex = currentFocusedTileIndex;
        
        if (card) {
            const layerConfig = config.layers[card.layer];
            const draggedDelta = draggedCardDeltas.current[card.id] || { x: 0, y: 0 };
            const tileOffset = TILE_OFFSETS[tileIndex];
            
            const cardInTilePos = {
              x: (worldSize.current.width / 2) + (card.position.x * layoutScaleFactor) + draggedDelta.x,
              y: (worldSize.current.height / 2) + (card.position.y * layoutScaleFactor) + draggedDelta.y
            };
            
            const cardElement = cardRefs.current?.[`${card.id}-${tileIndex}`];
            const cardUnscaledWidth = cardElement ? cardElement.offsetWidth : card.position.width * layoutScaleFactor;
            const cardUnscaledHeight = cardElement ? cardElement.offsetHeight : card.position.width * layoutScaleFactor * 1.25;

            const cardCenterInTileX = cardInTilePos.x + cardUnscaledWidth / 2;
            const cardCenterInTileY = cardInTilePos.y + cardUnscaledHeight / 2;
            
            const cardWorldCenterX = cardCenterInTileX + (tileOffset.x * worldSize.current.width);
            const cardWorldCenterY = cardCenterInTileY + (tileOffset.y * worldSize.current.height);

            const viewportCenterX = viewportSize.current.width / 2;
            const viewportCenterY = viewportSize.current.height / 2;
            const targetLayerPanX = viewportCenterX - cardWorldCenterX;
            const targetLayerPanY = viewportCenterY - cardWorldCenterY;

            const cardTargetPanX = targetLayerPanX / layerConfig.speed;
            const cardTargetPanY = targetLayerPanY / layerConfig.speed;

            const cardActualWidth = cardUnscaledWidth * card.position.scale;
            const cardActualHeight = cardUnscaledHeight * card.position.scale;

            const PERSPECTIVE = 1000;
            const targetPerceivedSize = Math.min(viewportSize.current.width, viewportSize.current.height) * 0.8;
            const requiredScale = targetPerceivedSize / Math.max(cardActualWidth, cardActualHeight);

            let cardTargetZ = PERSPECTIVE - (PERSPECTIVE / requiredScale) - layerConfig.baseZ;
            cardTargetZ = gsap.utils.clamp(MIN_CAMERA_Z, MAX_CAMERA_Z, cardTargetZ);
            
            const panPeriodX = layerConfig.speed > 0 ? worldSize.current.width / layerConfig.speed : 0;
            const panPeriodY = layerConfig.speed > 0 ? worldSize.current.height / layerConfig.speed : 0;
            const panDiffX = panPosition.current.x - cardTargetPanX;
            const panDiffY = panPosition.current.y - cardTargetPanY;
            const wrapX = panPeriodX > 0 ? Math.round(panDiffX / panPeriodX) : 0;
            const wrapY = panPeriodY > 0 ? Math.round(panDiffY / panPeriodY) : 0;
            const closestTargetPanX = cardTargetPanX + (wrapX * panPeriodX);
            const closestTargetPanY = cardTargetPanY + (wrapY * panPeriodY);
            
            panPosition.current.x += (closestTargetPanX - panPosition.current.x) * LERP_FACTOR_FOCUS;
            panPosition.current.y += (closestTargetPanY - panPosition.current.y) * LERP_FACTOR_FOCUS;
            cameraZ.current += (cardTargetZ - cameraZ.current) * LERP_FACTOR_FOCUS;
        }
      }

      gsap.set(scene, { z: cameraZ.current });
      layerElements.forEach((layer, i) => {
        const layerConfig = config.layers[i];
        const targetX = panPosition.current.x * layerConfig.speed;
        const targetY = panPosition.current.y * layerConfig.speed;
        const wrap = (value: number, max: number) => ((((value + max / 2) % max) + max) % max) - max / 2;
        gsap.set(layer, { x: wrap(targetX, worldSize.current.width), y: wrap(targetY, worldSize.current.height), z: layerConfig.baseZ });
      });

      const { mode, cardId, dragStartDelta, liveDelta } = interactionState.current;
      if (mode === 'DRAGGING_CARD' && cardId && cardRefs.current) {
        const cardConfig = CARD_DATA.find(c => c.id === cardId);
        if (!cardConfig) return;

        const initialX = (worldSize.current.width / 2) + (cardConfig.position.x * layoutScaleFactor);
        const initialY = (worldSize.current.height / 2) + (cardConfig.position.y * layoutScaleFactor);
        
        const liveX = initialX + dragStartDelta.x + liveDelta.x;
        const liveY = initialY + dragStartDelta.y + liveDelta.y;

        TILE_OFFSETS.forEach((_, tileIndex) => {
          const cardKey = `${cardId}-${tileIndex}`;
          const cardElement = cardRefs.current?.[cardKey];
          if (cardElement) {
            gsap.to(cardElement, {
              x: liveX,
              y: liveY,
              scale: cardConfig.position.scale * 1.05,
              z: 100,
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1)',
              duration: 0.3,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }
        });
      } else if (activeDragCardId === null && lastDraggedCardId.current) {
          const cardConfig = CARD_DATA.find(c => c.id === lastDraggedCardId.current);
          if (cardConfig) {
              TILE_OFFSETS.forEach((_, tileIndex) => {
                  const cardKey = `${cardConfig.id}-${tileIndex}`;
                  const el = cardRefs.current?.[cardKey];
                  if(el) {
                       gsap.to(el, {
                           scale: cardConfig.position.scale,
                           z: 0,
                           boxShadow: '0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08)',
                           duration: 0.4,
                           ease: 'power2.out',
                           overwrite: 'auto'
                       });
                  }
              });
          }
          lastDraggedCardId.current = null;
      }
    });

    return () => {
      resizeObserver.disconnect();
      engine.kill();
      gsap.ticker.remove(ticker);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []); 

  return { getCardEventHandlers, setFocusedCard, focusedCardId: focusedCard.id };
}

// ================================================================================================
// MAIN APP COMPONENT
// (from App.tsx)
// ================================================================================================

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { getCardEventHandlers, setFocusedCard, focusedCardId } = useParallax(containerRef, layerRefs, sceneRef, cardRefs);

  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
        setFocusedCard(null);
    }
  };

  return (
    <>
      <StyleInjector />
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
              focusedCardId={focusedCardId}
            />
          ))}
        </div>
      </div>
    </>
  );
}
