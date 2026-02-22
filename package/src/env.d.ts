declare const __BEANCOUNT_WASM_VERSION__: string;
declare const __BEANCOUNT_WASM_PROFILE__: "release" | "debug-symbols";

declare module "*.whl" {
  const bytes: Uint8Array;
  export default bytes;
}
