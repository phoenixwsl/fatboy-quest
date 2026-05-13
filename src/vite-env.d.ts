/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module '*.svg' {
  const src: string;
  export default src;
}
