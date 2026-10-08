import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/jetbrains-mono/500.css';
import './ui/styles.css';
import './ui/app.js';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });
