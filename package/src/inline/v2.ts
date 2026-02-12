import wheelBytes from "../../wheels/v2/beancount-2.3.6-cp313-cp313-emscripten_4_0_9_wasm32.whl";

export const VERSION = "v2";
export const FILENAME =
  "beancount-2.3.6-cp313-cp313-emscripten_4_0_9_wasm32.whl";

export function getInlineWheelBytes() {
  return wheelBytes;
}
