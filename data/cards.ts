/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export interface CardPosition {
  x: number;
  y: number;
  scale: number;
  width: number;
}

export interface CardData {
  id: string;
  layer: number;
  image: string;
  title: string;
  meta: string;
  position: CardPosition;
}

// --- CURATED MOCK DATA FOR CARDS (COZY LAYOUT) ---
export const CARD_DATA: CardData[] = [
  // Near Layer (layer: 2) - Most prominent
  { id: 'c1', layer: 2, image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', title: 'Abstract Forms', meta: 'Daniel Bornmann', position: { x: 150, y: -50, scale: 1.3, width: 400 } },
  { id: 'c3', layer: 2, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=80', title: 'Porcelain', meta: 'Adebayo Oyelawal', position: { x: -350, y: 250, scale: 1, width: 280 } },
  { id: 'c6', layer: 2, image: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=500&q=80', title: 'Monochrome', meta: 'Antonio Diacosia', position: { x: 550, y: 300, scale: 1, width: 250 } },
  { id: 'c9', layer: 2, image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=500&q=80', title: 'The Classics', meta: 'Natasha Jen', position: { x: -500, y: -400, scale: 0.8, width: 300 } },
  { id: 'c12', layer: 2, image: 'https://images.unsplash.com/photo-1506782081999-1139f8b45f09?w=500&q=80', title: 'Textured', meta: 'Rosella Mei', position: { x: 800, y: 550, scale: 0.9, width: 280 } },
  { id: 'c15', layer: 2, image: 'https://images.unsplash.com/photo-1487744479979-628f11409f52?w=500&q=80', title: 'Concrete Jungle', meta: 'Maxime Lebrun', position: { x: -800, y: 100, scale: 1, width: 320 } },
  { id: 'c17', layer: 2, image: 'https://images.unsplash.com/photo-1561729653-7313a07297a4?w=500&q=80', title: 'Iridescent', meta: 'FlyD', position: { x: 600, y: -300, scale: 1.1, width: 350 } },
  { id: 'c20', layer: 2, image: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=500&q=80', title: 'Powder Burst', meta: 'Dawid Zawiła', position: { x: 20, y: 400, scale: 1.25, width: 380 } },
  { id: 'c21', layer: 2, image: 'https://images.unsplash.com/photo-1572099606223-6e29712e5de4?w=500&q=80', title: 'Paper Cut', meta: 'Jr Korpa', position: { x: 1000, y: 200, scale: 1, width: 300 } },
  { id: 'c22', layer: 2, image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=500&q=80', title: 'Ink Wash', meta: 'Efe Kurnaz', position: { x: -1100, y: -250, scale: 1.2, width: 380 } },

  // Mid Layer (layer: 1) - Increased density for a richer scene
  { id: 'c2', layer: 1, image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&q=80', title: 'Organized Chaos', meta: 'Eva Tuer', position: { x: 400, y: 450, scale: 1.1, width: 350 } },
  { id: 'c5', layer: 1, image: 'https://images.unsplash.com/photo-1557853194-27237a3c334b?w=500&q=80', title: 'Retrograde', meta: 'Kappa', position: { x: -100, y: 700, scale: 0.9, width: 320 } },
  { id: 'c8', layer: 1, image: 'https://images.unsplash.com/photo-1604537525944-a6a132d137f1?w=500&q=80', title: 'Serenity', meta: 'Annu Kilpeläinen', position: { x: -600, y: 500, scale: 1.2, width: 420 } },
  { id: 'c11', layer: 1, image: 'https://images.unsplash.com/photo-1512428209245-56b9a80544f3?w=500&q=80', title: 'Architecture', meta: 'Ben Denzer', position: { x: 800, y: 100, scale: 1.1, width: 360 } },
  { id: 'c13', layer: 1, image: 'https://images.unsplash.com/photo-1531978224329-a10a5afd5218?w=500&q=80', title: 'Perspective', meta: 'Robert Caranito', position: { x: 1000, y: -200, scale: 1.2, width: 400 } },
  { id: 'c16', layer: 1, image: 'https://images.unsplash.com/photo-1618331835718-fa4222a5e2b9?w=500&q=80', title: 'Sculpted Mind', meta: 'Milad Fakurian', position: { x: 300, y: 800, scale: 0.9, width: 280 } },
  { id: 'c19', layer: 1, image: 'https://images.unsplash.com/photo-1526045612-6113b5951356?w=500&q=80', title: 'Simplicity', meta: 'J. Balla Photos', position: { x: 1100, y: 400, scale: 1, width: 300 } },
  { id: 'c23', layer: 1, image: 'https://images.unsplash.com/photo-153312132-29859c638640?w=500&q=80', title: 'Neon Dream', meta: 'Evol Lee', position: { x: -900, y: 800, scale: 1.1, width: 340 } },
  { id: 'c24', layer: 1, image: 'https://images.unsplash.com/photo-1525338078359-6c3571814b6a?w=500&q=80', title: 'Floral', meta: 'Kari Shea', position: { x: 1300, y: 700, scale: 1, width: 300 } },
  { id: 'c25', layer: 1, image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&q=80', title: 'Workspace', meta: 'Dmitri Popov', position: { x: 0, y: -500, scale: 1.3, width: 450 } },
  { id: 'c18', layer: 1, image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&q=80', title: 'Street Style', meta: 'Laura Chouette', position: { x: -1000, y: -100, scale: 1.2, width: 420 } },
  { id: 'c26', layer: 1, image: 'https://images.unsplash.com/photo-1504208434309-cb69f4c42448?w=500&q=80', title: 'Gradient', meta: 'Joel Filipe', position: { x: 1500, y: 500, scale: 1.3, width: 500 } },
  { id: 'c27', layer: 1, image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=500&q=80', title: 'Geometric', meta: 'Ricardo Gomez Angel', position: { x: -1400, y: 400, scale: 1.2, width: 450 } },
  { id: 'c28', layer: 1, image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&q=80', title: 'Fabric', meta: 'engin akyurt', position: { x: 400, y: 1100, scale: 1, width: 350 } },
  { id: 'c29', layer: 1, image: 'https://images.unsplash.com/photo-1562043236-559c3b65a6e2?w=500&q=80', title: 'Holographic', meta: 'gradienta', position: { x: -1200, y: -900, scale: 1.1, width: 400 } },

  // Far Layer (layer: 0) - Background elements, now sparser
  { id: 'c4', layer: 0, image: 'https://images.unsplash.com/photo-1549492423-400254a408a8?w=500&q=80', title: 'Pastel Dreams', meta: 'Heather Chambers', position: { x: 700, y: -500, scale: 1.2, width: 450 } },
  { id: 'c7', layer: 0, image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80', title: 'Color Splash', meta: 'Simon', position: { x: -700, y: 800, scale: 1, width: 380 } },
  { id: 'c10', layer: 0, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=80', title: 'Bloom', meta: 'Florence Okoye', position: { x: 100, y: -700, scale: 1, width: 330 } },
  { id: 'c14', layer: 0, image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=500&q=80', title: 'Cosmic Swirl', meta: 'NASA', position: { x: 1300, y: -400, scale: 1.1, width: 400 } },
  { id: 'c30', layer: 0, image: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=500&q=80', title: 'Glow', meta: 'Billy Huynh', position: { x: 1600, y: -800, scale: 1.2, width: 420 } },
];