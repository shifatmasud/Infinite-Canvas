/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { RefObject, useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react';
import { gsap } from 'gsap';
import { config, TILE_OFFSETS } from '../config/parallax';
import { createInteractionEngine, InteractionEngine } from '../engine/interaction';
import { CARD_DATA, CardData } from '../data/cards';

type InteractionMode = 'IDLE' | 'PANNING' | 'DRAGGING_CARD';

interface InteractionState {
  mode: InteractionMode;
  cardId: string | null;
  tileIndex: number | null;
  pointerStart: { x: number; y: number; };
  dragStartDelta: { x: number; y: number; };
  liveDelta: { x: number; y: number; };
}

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
  
  // Unified state for the focused card instance to drive React UI changes
  const [focusedCard, setFocusedCardState] = useState<{ id: string | null; tileIndex: number | null }>({ id: null, tileIndex: null });
  // Ref for the animation loop to ensure atomic reads of the focused card instance
  const focusedCardRef = useRef<{ id: string | null; tileIndex: number | null }>({ id: null, tileIndex: null });


  // Exposed function to update focus state atomically for both the animation loop and React UI
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
          // This is a click, manage focus state
          const { id: currentFocusedId } = focusedCardRef.current;
          
          // If no card is currently focused, focus on the clicked card.
          if (currentFocusedId === null) {
            setFocusedCard(cardId, tileIndex);
          } else {
            // A card is currently focused. Any click on any card will now unfocus.
            setFocusedCard(null);
          }
        } else {
          // This was a drag, update the card's position
          draggedCardDeltas.current[cardId] = {
            x: dragStartDelta.x + liveDelta.x,
            y: dragStartDelta.y + liveDelta.y,
          };
          // A drag should always result in a free-roam (unfocused) state.
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
        // Card positions are relative to the world center, so we offset them by half the world size for CSS positioning.
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
              height: card.position.width * layoutScaleFactor * 1.25, // Explicitly set height
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
        // Only pan the scene if we are not actively dragging a card.
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
        // Calculate the new target Z based on the zoom direction.
        const newTargetZ = oldTargetZ + (deltaY > 0 ? -ANTICIPATION_AMOUNT : ANTICIPATION_AMOUNT);

        const PERSPECTIVE = 1000;
        
        // Determine the reference layer for zoom calculations.
        let refLayerIndex = 1; 
        const { id: currentFocusedId } = focusedCardRef.current;
        if (currentFocusedId) {
            const card = CARD_DATA.find(c => c.id === currentFocusedId);
            if (card) {
                refLayerIndex = card.layer;
            }
        }
        const { speed, baseZ } = config.layers[refLayerIndex];

        // Calculate the reference layer's depth before and after the zoom.
        const Z_old = baseZ + oldTargetZ;
        const Z_new = baseZ + newTargetZ;

        // Prevent division by zero if the layer is at the perspective plane.
        if (PERSPECTIVE - Z_old === 0 || PERSPECTIVE - Z_new === 0) return;

        // Calculate how much the scene will appear to scale from the cursor's perspective.
        const scale_ratio = (PERSPECTIVE - Z_old) / (PERSPECTIVE - Z_new);

        // Get cursor position relative to the viewport center.
        const mx = event.clientX;
        const my = event.clientY;
        const cx = viewportSize.current.width / 2;
        const cy = viewportSize.current.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        
        // Calculate the apparent shift of the point under the cursor on the screen.
        const screen_shift_x = dx * (scale_ratio - 1);
        const screen_shift_y = dy * (scale_ratio - 1);
        
        // Calculate the panning impulse needed to counteract this shift and keep the point under the cursor stationary.
        const new_scale = PERSPECTIVE / (PERSPECTIVE - Z_new);
        if (speed === 0 || new_scale === 0) return;
        
        const pan_impulse_x = -screen_shift_x / (speed * new_scale);
        const pan_impulse_y = -screen_shift_y / (speed * new_scale);
        
        // Apply the impulse to the pan velocity.
        panVelocity.current.x += pan_impulse_x;
        panVelocity.current.y += pan_impulse_y;
        
        // Apply the original zoom logic.
        targetCameraZ.current = newTargetZ;
        zoomVelocity.current -= deltaY * ZOOM_SPEED_MULTIPLIER;
      },
    });
    setInteractionEngine(engine);

    const ticker = gsap.ticker.add(() => {
      const layerElements = layerRefs.current?.filter(el => el !== null) as HTMLDivElement[] | undefined;
      if (!layerElements || !scene) return;

      // --- Unified Physics Simulation ---
      const LERP_FACTOR_FOCUS = 0.08;
      const LERP_FACTOR_FREE = 0.1;
      const PAN_DAMPING_FACTOR = 0.90;
      const ZOOM_DAMPING_FACTOR = 0.88;
      const MIN_CAMERA_Z = -4000;
      const MAX_CAMERA_Z = 750;

      // Apply user-driven zoom velocity
      targetCameraZ.current += zoomVelocity.current;
      targetCameraZ.current = gsap.utils.clamp(MIN_CAMERA_Z, MAX_CAMERA_Z, targetCameraZ.current);
      zoomVelocity.current *= ZOOM_DAMPING_FACTOR;
      // Smoothly move camera to its target Z
      cameraZ.current += (targetCameraZ.current - cameraZ.current) * LERP_FACTOR_FREE;

      // Apply user-driven pan velocity
      panPosition.current.x += panVelocity.current.x;
      panPosition.current.y += panVelocity.current.y;
      panVelocity.current.x *= PAN_DAMPING_FACTOR;
      panVelocity.current.y *= PAN_DAMPING_FACTOR;

      // Atomically read the focused card instance from the ref
      const { id: currentFocusedId, tileIndex: currentFocusedTileIndex } = focusedCardRef.current;

      // If a card is focused, apply an attraction force to pull the camera towards it
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
            
            // --- Find the closest wrapped target to prevent jarring jumps ---
            // The world repeats for each layer based on its speed. We need to find the
            // equivalent target pan position that is closest to the current pan position.
            const panPeriodX = layerConfig.speed > 0 ? worldSize.current.width / layerConfig.speed : 0;
            const panPeriodY = layerConfig.speed > 0 ? worldSize.current.height / layerConfig.speed : 0;

            const panDiffX = panPosition.current.x - cardTargetPanX;
            const panDiffY = panPosition.current.y - cardTargetPanY;

            // Calculate how many 'periods' away the shortest path is.
            const wrapX = panPeriodX > 0 ? Math.round(panDiffX / panPeriodX) : 0;
            const wrapY = panPeriodY > 0 ? Math.round(panDiffY / panPeriodY) : 0;

            // Adjust the target to the closest equivalent position.
            const closestTargetPanX = cardTargetPanX + (wrapX * panPeriodX);
            const closestTargetPanY = cardTargetPanY + (wrapY * panPeriodY);
            
            panPosition.current.x += (closestTargetPanX - panPosition.current.x) * LERP_FACTOR_FOCUS;
            panPosition.current.y += (closestTargetPanY - panPosition.current.y) * LERP_FACTOR_FOCUS;
            cameraZ.current += (cardTargetZ - cameraZ.current) * LERP_FACTOR_FOCUS;
        }
      }

      // --- Scene & Layer Updates ---
      gsap.set(scene, { z: cameraZ.current });
      layerElements.forEach((layer, i) => {
        const layerConfig = config.layers[i];
        const targetX = panPosition.current.x * layerConfig.speed;
        const targetY = panPosition.current.y * layerConfig.speed;
        const wrap = (value: number, max: number) => ((((value + max / 2) % max) + max) % max) - max / 2;
        gsap.set(layer, { x: wrap(targetX, worldSize.current.width), y: wrap(targetY, worldSize.current.height), z: layerConfig.baseZ });
      });

      // --- Unified Card Drag Physics & Animation ---
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
          lastDraggedCardId.current = null; // Consume the ref value
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