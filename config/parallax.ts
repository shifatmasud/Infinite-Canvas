/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface LayerConfig {
  /**
   * Movement speed multiplier. 1 = moves with the cursor. <1 = parallax effect.
   */
  speed: number;
  /**
   * The base depth of the layer in the 3D scene.
   */
  baseZ: number;
  className: string;
}

export interface ParallaxConfig {
  layers: LayerConfig[];
  scrollSpeed: number;
  /** The base width of the world for positioning cards. */
  baseWorldWidth: number;
  /** The base height of the world for positioning cards. */
  baseWorldHeight: number;
}

/**
 * Generates a square grid of tile offsets for seamless wrapping.
 * @param size The dimension of the grid (e.g., 3 for 3x3, 5 for 5x5). Must be an odd number.
 * @returns An array of {x, y} offset coordinates.
 */
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


// Defines a 5x5 grid for tiling, providing a larger buffer to prevent flicker.
export const TILE_OFFSETS = generateTileOffsets(5);

// Configuration for the parallax layers and motion
export const config: ParallaxConfig = {
  layers: [
    // Layers are ordered from back to front.
    // Deeper layers have a more negative baseZ.
    { speed: 0.3, baseZ: -600, className: 'layer-far' },
    { speed: 0.6, baseZ: -300, className: 'layer-mid' },
    { speed: 1.0, baseZ: 0, className: 'layer-near' },
  ],
  scrollSpeed: 1, // Tuned for a good feel with the new inertia physics.
  baseWorldWidth: 4000,
  baseWorldHeight: 4000,
};