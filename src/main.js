/**
 * Nava-e-Ayat — Entry Point
 * Initializes Divine Light, Liquid Touch, and mounts App.
 */

import './styles/main.css';
import { DivineLight } from './engine/shader.js';
import { LiquidTouch } from './engine/liquidTouch.js';
import { App } from './components/App.js';

// Initialize Divine Light shader
const canvas = document.getElementById('divine-light-canvas');
if (canvas) {
    const divineLight = new DivineLight(canvas);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) divineLight.stop();
        else divineLight.start();
    });
}

// Initialize Liquid Touch ripples
const liquidTouch = new LiquidTouch();

// Mount App
const appRoot = document.getElementById('app');
if (appRoot) {
    const app = new App(appRoot);
}
