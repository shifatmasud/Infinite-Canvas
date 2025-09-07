/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

interface InteractionCallbacks {
  onDragStart: () => void;
  onDrag: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onWheelPan: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onZoom: ({ zoomMultiplier }: { zoomMultiplier: number; }) => void;
  onRelease: ({ velocityX, velocityY }: { velocityX: number, velocityY: number }) => void;
}

export function createInteractionEngine(
  target: HTMLElement,
  callbacks: InteractionCallbacks
) {
  const observer = Observer.create({
    target,
    type: 'wheel,touch,pointer',
    dragMinimum: 2,
    onDragStart: () => {
      callbacks.onDragStart();
    },
    onDrag: self => {
      // Direct manipulation: content moves with the pointer.
      callbacks.onDrag({ deltaX: self.deltaX, deltaY: self.deltaY });
    },
    onRelease: self => {
      // Pass direct velocity to match the drag direction.
      callbacks.onRelease({ velocityX: self.velocityX, velocityY: self.velocityY });
    },
    onWheel: self => {
      // Cast event to WheelEvent to access ctrlKey property.
      if ((self.event as WheelEvent).ctrlKey) {
        const zoomFactor = 0.05;
        const zoomDirection = self.deltaY < 0 ? 1 : -1;
        callbacks.onZoom({ zoomMultiplier: 1 + zoomDirection * zoomFactor });
      } else {
        // Inverted for "natural" scroll feel (content moves opposite to pointer)
        callbacks.onWheelPan({ deltaX: -self.deltaX, deltaY: -self.deltaY });
      }
    },
    preventDefault: true,
  });

  const getDistance = (touches: TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const pinchState = { isPinching: false, initialDistance: 0 };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchState.isPinching = true;
      pinchState.initialDistance = getDistance(e.touches);
      observer.disable();
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (pinchState.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const zoomMultiplier = newDistance / pinchState.initialDistance;
      callbacks.onZoom({ zoomMultiplier });
      pinchState.initialDistance = newDistance; // Reset for next move event
    }
  };

  const handleTouchEnd = () => {
    if (pinchState.isPinching) {
      pinchState.isPinching = false;
      observer.enable();
    }
  };

  target.addEventListener('touchstart', handleTouchStart, { passive: false });
  target.addEventListener('touchmove', handleTouchMove, { passive: false });
  target.addEventListener('touchend', handleTouchEnd);
  target.addEventListener('touchcancel', handleTouchEnd);


  return {
    kill: () => {
      observer.kill();
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchEnd);
    }
  };
}