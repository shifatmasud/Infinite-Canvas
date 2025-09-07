/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface LayerConfig {
  depth: number;
  /**
   * Smoothing factor for movement. Smaller values = more lag.
   * A value between 0 and 1.
   */
  lag: number;
  className: string;
}

export interface ParallaxConfig {
  layers: LayerConfig[];
  scrollSpeed: number;
  /** The width of the world before content wraps. */
  worldWidth: number;
  /** The height of the world before content wraps. */
  worldHeight: number;
}

// Defines a 3x3 grid for tiling, including the center tile
export const TILE_OFFSETS = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
  { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 },
  { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

// Configuration for the parallax layers and motion
export const config: ParallaxConfig = {
  layers: [
    // Deeper layers (smaller depth) have more lag (smaller lag factor)
    { depth: 0.1, lag: 0.05, className: 'layer-far' },
    { depth: 0.4, lag: 0.1, className: 'layer-mid' },
    { depth: 1.0, lag: 0.15, className: 'layer-near' },
  ],
  scrollSpeed: 1.8,
  worldWidth: 2500,
  worldHeight: 2200,
};