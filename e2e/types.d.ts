// Tipos dos ganchos de instrumentação usados nos specs de View Transition.
// Sem isso, `window.__animClips` é ts(2339) em todo spec que o instala.
export {};

declare global {
  interface Window {
    /** Clipes capturados do Element.prototype.animate durante a transição. */
    __animClips?: Array<{ from?: unknown; opacity?: string; pseudo?: string | null }>;
    /** performance.now() do início da animação de troca de tema. */
    __animStartedAt?: number;
    /** Flag usada pelo demo de captura. */
    __animating?: boolean;
  }
}
