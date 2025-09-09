
# Infinite 3D Parallax Canvas for React & Framer

**Live Demo: [https://conclusive-form-676715.framer.app/home-3](https://conclusive-form-676715.framer.app/home-3)**

This project is a modular, physics-based 3D parallax system built with React, GSAP, and designed to be used as a standalone component, particularly within Framer. It creates an infinite, zoomable canvas where you can place content on different layers to achieve a compelling depth effect. The interactions are driven by a simple physics simulation, providing a natural and fluid user experience with inertia and damping.

---

## ✨ Features

-   **3D Parallax Effect:** Layers move at different speeds based on their configured Z-depth, creating a realistic sense of depth.
-   **Infinite Tiling:** The world seamlessly wraps in all directions, allowing for endless exploration of the canvas.
-   **Physics-Based Interactions:** Smooth, inertia-driven movement for panning and zooming. The motion doesn't stop abruptly but gently eases out.
-   **Cursor-Aware Zooming:** The canvas zooms in and out relative to the cursor's position, keeping the user's point of interest centered.
-   **Interactive Cards:** Users can drag cards to reposition them or click to focus, which smoothly animates the camera to frame the selected card.
-   **Performant:** It uses `gsap.ticker` for the animation loop and `useRef` extensively to avoid unnecessary React re-renders, ensuring high performance.
-   **Highly Customizable (in Framer):** Tweak dozens of properties like colors, speeds, scales, interaction toggles, and more directly from the Framer UI.
-   **Self-Contained Component:** The `Framer/InfiniteCanvas.tsx` component encapsulates all logic, styling, and dependencies, making it easy to drop into any Framer project.

---

## 🚀 How It Works

The system is built on a few core concepts:

1.  **3D Scene:** The main container establishes a CSS `perspective`, creating a 3D space. The scene inside it uses `transform-style: preserve-3d` to allow its children (the layers) to be positioned in 3D space.

2.  **Parallax Layers:** The scene contains multiple layers, each with a different `speed` and `baseZ` position. When the user pans, the position is multiplied by the layer's `speed`, causing layers with lower speed values (further away) to move less than layers with higher speed values (closer).

3.  **Infinite Tiling:** The "world" on each layer is much larger than the viewport. To make it infinite, the content is placed on a central tile, and this tile is surrounded by a grid of identical clones (e.g., a 5x5 grid). As the user pans, a `wrap` function calculates the position and instantly teleports the layer when it goes off-screen, creating a seamless and endless canvas.

4.  **Physics & Animation Loop:**
    -   **`gsap/Observer`:** This GSAP plugin is the brain of the interaction. It listens for all pointer, touch, and wheel events and translates them into simple `deltaX`, `deltaY` values.
    -   **`gsap.ticker`:** This is the project's heartbeat. It's a highly optimized `requestAnimationFrame` loop that runs 60 times per second.
    -   **Inertia:** Inside the ticker, we maintain `panVelocity` and `zoomVelocity` refs. User input adds to these velocities. On each tick, a portion of the velocity is added to the position, and the velocity itself is reduced by a damping factor (e.g., `velocity *= 0.90`). This creates the effect of the movement gradually slowing down.

5.  **State Management (`useRef` vs. `useState`):**
    -   `useRef` is used for all values that change frequently within the animation loop (like `panPosition`, `cameraZ`). This is critical for performance, as updating a ref **does not** trigger a component re-render. The ticker can read the latest values directly.
    -   `useState` is used only for state that requires a React re-render to visually update the component tree, such as the `focusedCardId`. When a card is focused, the state changes, causing other cards to receive a `isDimmed` prop and update their appearance accordingly.

---

## 📁 Key Files

-   **`Framer/InfiniteCanvas.tsx`**: The primary, self-contained component for use in Framer. It includes all logic, sub-components, default props, and Framer property controls.
-   **`Framer/SearchBar.tsx`**: A reusable and animatable search bar component used by the main canvas.
-   **`index.tsx`**: The entry point for rendering the React application, which simply renders the `<InfiniteCanvas />`.
-   **`eli5.txt`**: A simplified explanation of the project's structure and data flow.
