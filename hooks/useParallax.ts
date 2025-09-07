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
  const camera = useRef({ z: 0 });
  const position = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = sceneRef.current;
    if (!scene) return;

    const allCards = cardRefs.current;
    if (!allCards) return;
    
    gsap.killTweensOf([position.current, camera.current, velocity.current]);
    
    const viewport = { width: container.clientWidth, height: