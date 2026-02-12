import wheelBytes from "../../wheels/v3/beancount-3.2.0-cp313-cp313-emscripten_4_0_9_wasm32.whl";

export const VERSION = "v3";
export const FILENAME =
  "beancount-3.2.0-cp313-cp313-emscripten_4_0_9_wasm32.whl";

export function getInlineWheelBytes() {
  return wheelBytes;
}
