/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, RefObject, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { config } from '../config/parallax';

gsap.registerPlugin(Draggable);

export function useParallax(
  containerRef: RefObject<HTMLDivElement>,
  layerRefs: RefObject<(HTMLDivElement | null)[]>,
  zoomWrapperRef: RefObject<HTMLDivElement>
) {
  const zoom = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const zoomWrapper = zoomWrapperRef.current;
    if (!zoomWrapper) return;

    const layerElements = layerRefs.current?.filter(el => el !== null) as HTMLDivElement[] | undefined;
    if (!layerElements) return;

    const proxy = document.createElement('div');

    const draggableInstance = Draggable.create(proxy, {
      trigger: container,
      type: 'x,y',
      inertia: true,
      dragResistance: 0.0,
      edgeResistance: 0.0,
    })[0];

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Trackpad Zoom (Ctrl/Cmd + Scroll)
      if (e.ctrlKey) {
        const zoomFactor = 0.05;
        const zoomDirection = e.deltaY < 0 ? 1 : -1;
        const newZoom = zoom.current + zoomDirection * zoomFactor * zoom.current;
        zoom.current = gsap.utils.clamp(0.5, 3, newZoom);
        gsap.set(zoomWrapper, { scale: zoom.current });
        return; // Prevent panning while zooming
      }

      // Panning with scroll wheel
      const currentX = gsap.getProperty(proxy, 'x') as number;
      const currentY = gsap.getProperty(proxy, 'y') as number;

      const newX = currentX - e.deltaX * config.scrollSpeed / zoom.current;
      const newY = currentY - e.deltaY * config.scrollSpeed / zoom.current;
      
      gsap.set(proxy, { x: newX, y: newY });
      
      draggableInstance.update(true);
    };

    const getDistance = (touches: TouchList) => {
      return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    };

    const pinchState = { isPinching: false, initialDistance: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchState.isPinching = true;
        pinchState.initialDistance = getDistance(e.touches);
        draggableInstance.disable();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pinchState.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getDistance(e.touches);
        const scale = newDistance / pinchState.initialDistance;
        zoom.current = gsap.utils.clamp(0.5, 3, zoom.current * scale);
        pinchState.initialDistance = newDistance;
        gsap.set(zoomWrapper, { scale: zoom.current });
      }
    };

    const handleTouchEnd = () => {
      if (pinchState.isPinching) {
        pinchState.isPinching = false;
        draggableInstance.enable();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);


    const layerPositions = config.layers.map(() => ({ x: 0, y: 0 }));

    const ticker = gsap.ticker.add(() => {
      const proxyX = gsap.getProperty(proxy, 'x') as number;
      const proxyY = gsap.getProperty(proxy, 'y') as number;

      layerElements.forEach((layer, i) => {
        const layerConfig = config.layers[i];
        const currentPos = layerPositions[i];
        
        const targetX = proxyX * layerConfig.depth;
        const targetY = proxyY * layerConfig.depth;

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
      });
    });

    return () => {
      draggableInstance?.kill();
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      gsap.ticker.remove(ticker);
    };

  }, [containerRef, layerRefs, zoomWrapperRef]);
}