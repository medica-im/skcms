import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

/**
 * Where MapLibre 6 loads its web worker from. Import this module, for its side
 * effect, in every component that renders a <MapLibre>.
 *
 * Left to itself MapLibre looks for the worker next to its own chunk, through a
 * `new URL()` built from a template string. Vite cannot follow that, so the
 * production build never emits the file and the request 404s; `?worker&url`
 * makes Vite bundle the worker and hand back its real URL.
 */
setWorkerUrl(workerUrl);
