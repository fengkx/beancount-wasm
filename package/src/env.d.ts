declare const __BEANCOUNT_WASM_VERSION__: string;

declare module "*.whl" {
  const bytes: Uint8Array;
  export default bytes;
}
