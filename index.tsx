/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import ReactDOM from 'react-dom/client';
import { infinitecanvas as InfiniteCanvas } from './Framer/infiniteCanvas';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Provide some default image content for the cards. The Framer component
// uses these to populate the default cards it defines.
const content = [
  <img key="img1" src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=80" alt="Abstract Forms" />,
  <img key="img2" src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&q=80" alt="Organized Chaos" />,
  <img key="img3" src="https://images.unsplash.com/photo-1549492423-400254a408a8?w=500&q=80" alt="Pastel Dreams" />,
];


root.render(<InfiniteCanvas contentSlots={content} />);