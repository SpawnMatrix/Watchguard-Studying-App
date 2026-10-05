/**
 * The one place sections import motion from.
 *
 * Motion is about 120 kB minified, and only the lazily-loaded sections use it, so the app shell does
 * not import it: its own transitions are CSS, which `prefers-reduced-motion` in index.css already
 * covers. JavaScript-driven animations ignore that CSS rule, so this module switches them off for
 * anyone who has asked their system for less motion. It runs once, when the first section that
 * animates loads.
 */
import { MotionGlobalConfig } from 'motion/react';

if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
  MotionGlobalConfig.skipAnimations = true;
}

export { motion, AnimatePresence, useReducedMotion } from 'motion/react';
