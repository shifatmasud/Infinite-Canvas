/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { RefObject, useRef, useLayoutEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { config, TILE_OFFSETS } from '../config/parallax';
import { createInteractionEngine, InteractionEngine } from '../engine/interaction';
import { CARD_DATA, CardData } from '../data/cards';

type InteractionMode = 'IDLE' | 'PANNING' | 'DRAGGING_CARD';

export function useParallax(
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
  
  const interactionState = useRef<{
    mode: InteractionMode;
    cardId: string | null;
    pointerStart: { x: number; y: number };
    dragStartDelta: { x: number; y: number };
    liveDelta: { x: number; y: number };
  }>({
    mode: 'IDLE',
    cardId: null,
    pointerStart: { x: 0, y: 0 },
    dragStartDelta: { x: 0, y: 0 },
    liveDelta: { x: 0, y: 0 },
  });

  const [interactionEngine, setInteractionEngine] = useState<InteractionEngine | null>(null);
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);

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
    
    const { cardId, dragStartDelta, liveDelta } = interactionState.current;
    if (cardId) {
      draggedCardDeltas.current[cardId] = {
        x: dragStartDelta.x + liveDelta.x,
        y: dragStartDelta.y + liveDelta.y,
      };
    }
    
    interactionState.current = { ...interactionState.current, mode: 'IDLE', cardId: null, liveDelta: {x: 0, y: 0} };
    setActiveDragCardId(null);
    interactionEngine?.enable();

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [interactionEngine, handlePointerMove]);

  const handlePointerDown = useCallback((card: CardData, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    interactionEngine?.disable();
    
    interactionState.current = {
      mode: 'DRAGGING_CARD',
      cardId: card.id,
      pointerStart: { x: event.clientX, y: event.clientY },
      dragStartDelta: draggedCardDeltas.current[card.id] || { x: 0, y: 0 },
      liveDelta: { x: 0, y: 0 }
    };
    setActiveDragCardId(card.id);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [interactionEngine, handlePointerMove, handlePointerUp]);

  const getCardEventHandlers = useCallback((card: CardData) => ({
      isDragging: card.id === activeDragCardId,
      eventHandlers: {
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => handlePointerDown(card, e),
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
        const initialX = card.position.x * layoutScaleFactor;
        const initialY = card.position.y * layoutScaleFactor;

        TILE_OFFSETS.forEach((_, tileIndex) => {
          const cardKey = `${card.id}-${tileIndex}`;
          const cardElement = allCards[cardKey];
          if (cardElement) {
            gsap.set(cardElement, {
              x: initialX + draggedDelta.x,
              y: initialY + draggedDelta.y,
              width: card.position.width * layoutScaleFactor,
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
      onZoom: ({ deltaY }) => {
        const ZOOM_SPEED_MULTIPLIER = 5;
        const ANTICIPATION_AMOUNT = 30;
        targetCameraZ.current += (deltaY > 0 ? -ANTICIPATION_AMOUNT : ANTICIPATION_AMOUNT);
        zoomVelocity.current -= deltaY * ZOOM_SPEED_MULTIPLIER;
      }
    });
    setInteractionEngine(engine);

    const ticker = gsap.ticker.add(() => {
      const layerElements = layerRefs.current?.filter(el => el !== null) as HTMLDivElement[] | undefined;
      if (!layerElements || !scene) return;

      // Pan & Zoom Physics
      const LERP_FACTOR = 0.1;
      const PAN_DAMPING_FACTOR = 0.90;
      const ZOOM_DAMPING_FACTOR = 0.88;
      const MIN_CAMERA_Z = -4000;
      const MAX_CAMERA_Z = 750;

      targetCameraZ.current += zoomVelocity.current;
      targetCameraZ.current = gsap.utils.clamp(MIN_CAMERA_Z, MAX_CAMERA_Z, targetCameraZ.current);
      zoomVelocity.current *= ZOOM_DAMPING_FACTOR;
      cameraZ.current += (targetCameraZ.current - cameraZ.current) * LERP_FACTOR;

      panPosition.current.x += panVelocity.current.x;
      panPosition.current.y += panVelocity.current.y;
      panVelocity.current.x *= PAN_DAMPING_FACTOR;
      panVelocity.current.y *= PAN_DAMPING_FACTOR;

      // Scene & Layer Updates
      gsap.set(scene, { z: cameraZ.current });
      layerElements.forEach((layer, i) => {
        const layerConfig = config.layers[i];
        const targetX = panPosition.current.x * layerConfig.speed;
        const targetY = panPosition.current.y * layerConfig.speed;
        const wrap = (value: number, max: number) => ((((value + max / 2) % max) + max) % max) - max / 2;
        gsap.set(layer, { x: wrap(targetX, worldSize.current.width), y: wrap(targetY, worldSize.current.height), z: layerConfig.baseZ });
      });

      // Unified Card Drag Physics & Animation
      const { mode, cardId, dragStartDelta, liveDelta } = interactionState.current;
      if (mode === 'DRAGGING_CARD' && cardId && cardRefs.current) {
        const cardConfig = CARD_DATA.find(c => c.id === cardId);
        if (!cardConfig) return;

        const initialX = cardConfig.position.x * layoutScaleFactor;
        const initialY = cardConfig.position.y * layoutScaleFactor;
        
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
      } else if (activeDragCardId === null) { // Ensure settle animation happens after state is cleared
          CARD_DATA.forEach(cardConfig => {
              const cardElement = cardRefs.current?.[`${cardConfig.id}-0`];
              if(cardElement && (gsap.getProperty(cardElement, "z") as number) > 0) {
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
          });
      }
    });

    return () => {
      resizeObserver.disconnect();
      engine.kill();
      gsap.ticker.remove(ticker);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []); // Note: Empty dependency array is intentional for this singleton-like hook.

  return { getCardEventHandlers };
}