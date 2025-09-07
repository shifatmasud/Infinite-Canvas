/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, RefObject, useRef } from 'react';
import { gsap } from 'gsap';
import { config, TILE_OFFSETS } from '../config/parallax';
import { createInteractionEngine } from '../engine/interaction';
import { CARD_DATA } from '../data/cards';

export function useParallax(
  containerRef: RefObject<HTMLDivElement>,
  layerRefs: RefObject<(HTMLDivElement | null)[]>,
  sceneRef: RefObject<HTMLDivElement>,
  cardRefs: RefObject<{ [key: string]: HTMLDivElement | null }>
) {
  const position = useRef({ x: 0, y: 0 }); // Smoothly interpolated position
  const targetPosition = useRef({ x: 0, y: 0 }); // Immediate target position from input
  const zoom = useRef({ scale: 1 }); // Smoothly interpolated zoom
  const targetZoom = useRef({ scale: 1 }); // Immediate target zoom from input


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = sceneRef.current;
    if (!scene) return;

    const allCards = cardRefs.current;
    if (!allCards) return;
    
    gsap.killTweensOf([position.current, targetPosition.current, zoom.current, targetZoom.current]);
    
    const viewport = { width: container.clientWidth, height: container.clientHeight };

    const interactionEngine = createInteractionEngine(container, {
      onDrag: ({ deltaX, deltaY }) => {
        targetPosition.current.x += (deltaX * config.scrollSpeed) / zoom.current.scale;
        targetPosition.current.y += (deltaY * config.scrollSpeed) / zoom.current.scale;
      },
      onWheelPan: ({ deltaX, deltaY }) => {
        targetPosition.current.x += (deltaX * config.scrollSpeed) / zoom.current.scale;
        targetPosition.current.y += (deltaY * config.scrollSpeed) / zoom.current.scale;
      },
      onZoom: ({ deltaY }) => {
        const ZOOM_SPEED = 0.002;
        const MIN_ZOOM = 0.4;
        const MAX_ZOOM = 3.0;

        let newScale = targetZoom.current.scale - deltaY * ZOOM_SPEED;
        targetZoom.current.scale = gsap.utils.clamp(MIN_ZOOM, MAX_ZOOM, newScale);
      }
    });

    const layerPositions = config.layers.map(() => ({ x: 0, y: 0 }));

    const ticker = gsap.ticker.add(() => {
      const layerElements = layerRefs.current?.filter(el => el !== null) as HTMLDivElement[] | undefined;
      if (!layerElements) return;

      const LERP_FACTOR = 0.08;

      // --- LERP towards target zoom ---
      zoom.current.scale += (targetZoom.current.scale - zoom.current.scale) * LERP_FACTOR;
      if (Math.abs(targetZoom.current.scale - zoom.current.scale) < 0.001) {
        zoom.current.scale = targetZoom.current.scale;
      }
      
      // --- LERP towards target position ---
      position.current.x += (targetPosition.current.x - position.current.x) * LERP_FACTOR;
      position.current.y += (targetPosition.current.y - position.current.y) * LERP_FACTOR;

      if (Math.abs(targetPosition.current.x - position.current.x) < 0.01) {
        position.current.x = targetPosition.current.x;
      }
      if (Math.abs(targetPosition.current.y - position.current.y) < 0.01) {
        position.current.y = targetPosition.current.y;
      }

      // Apply zoom to the scene
      gsap.set(scene, { scale: zoom.current.scale });

      layerElements.forEach((layer, i) => {
        const layerConfig = config.layers[i];
        const currentPos = layerPositions[i];
        
        const targetX = position.current.x * layerConfig.depth;
        const targetY = position.current.y * layerConfig.depth;

        currentPos.x += (targetX - currentPos.x) * layerConfig.lag;
        currentPos.y += (targetY - currentPos.y) * layerConfig.lag;

        const wrap = (value: number, max: number) => {
          const range = max;
          const half = range / 2;
          return ((((value + half) % range) + range) % range) - half;
        };

        const wrappedX = wrap(currentPos.x, config.worldWidth);
        const wrappedY = wrap(currentPos.y, config.worldHeight);
        
        gsap.set(layer, { x: wrappedX, y: wrappedY });

        // --- Dynamic Z-Depth Calculation ---
        const layerCards = CARD_DATA.filter(card => card.layer === i);
        const focusRadius = Math.min(viewport.width, viewport.height) * 0.7;
        const maxZBoost = 150;
        const zJitterRange = 40; // The range for the z-offset (+/- 20px)

        // A simple hashing function to create a deterministic "random" value from a string.
        const simpleHash = (s: string) => s.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);

        TILE_OFFSETS.forEach((offset, tileIndex) => {
            const tileX = offset.x * config.worldWidth;
            const tileY = offset.y * config.worldHeight;

            layerCards.forEach(card => {
                const cardKey = `${card.id}-${tileIndex}`;
                const cardElement = allCards[cardKey];
                if (!cardElement) return;

                const cardWorldX = card.position.x + tileX;
                const cardWorldY = card.position.y + tileY;
                
                const distFromCenterX = cardWorldX - currentPos.x;
                const distFromCenterY = cardWorldY - currentPos.y;
                
                const distance = Math.hypot(distFromCenterX, distFromCenterY);

                const proximity = Math.max(0, 1 - (distance / focusRadius));
                const zBoost = Math.pow(proximity, 2) * maxZBoost;
                
                // Add a deterministic jitter based on the card's ID
                const hash = simpleHash(card.id);
                const zJitter = (hash % zJitterRange) - (zJitterRange / 2);

                // Apply jitter permanently to give each card a unique base depth
                const finalZ = card.position.z + zBoost + zJitter;
                
                cardElement.style.setProperty('--transform', `translateZ(${finalZ}px) scale(${card.position.scale})`);
            });
        });

      });
    });

    return () => {
      interactionEngine.kill();
      gsap.ticker.remove(ticker);
      gsap.killTweensOf([position.current, targetPosition.current, zoom.current, targetZoom.current]);
    };

  }, [containerRef, layerRefs, sceneRef, cardRefs]);
}