/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

interface InteractionCallbacks {
  onDrag: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onWheelPan: ({ deltaX, deltaY }: { deltaX: number; deltaY: number; }) => void;
  onZoom: ({ deltaY }: { deltaY: number; }) => void;
}

export function createInteractionEngine(
  target: HTMLElement,
  callbacks: InteractionCallbacks
) {
  const observer = Observer.create({
    target,
    type: 'wheel,touch,pointer',
    dragMinimum: 2,
    onDrag: self => {
      // Direct manipulation: content moves with the pointer.
      callbacks.onDrag({ deltaX: self.deltaX, deltaY: self.deltaY });
    },
    onWheel: self => {
      // FIX: Cast event to WheelEvent to access ctrlKey and metaKey properties.
      const wheelEvent = self.event as WheelEvent;
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
        // Zooming
        callbacks.onZoom({ deltaY: self.deltaY });
      } else {
        // Inverted for "natural" scroll feel (content moves opposite to pointer)
        callbacks.onWheelPan({ deltaX: -self.deltaX, deltaY: -self.deltaY });
      }
    },
    preventDefault: true,
  });

  return {
    kill: () => {
      observer.kill();
    }
  };
}