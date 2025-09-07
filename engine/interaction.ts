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
  onZoom: ({ deltaY, event }: { deltaY: number; event: WheelEvent; }) => void;
}

export interface InteractionEngine {
  kill: () => void;
  enable: () => void;
  disable: () => void;
}

export function createInteractionEngine(
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
