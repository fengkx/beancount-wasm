import wheelBytes from "../../wheels/v3/beancount-3.2.0-cp311-cp311-emscripten_3_1_46_wasm32.whl";

export const VERSION = "v3";
export const FILENAME =
  "beancount-3.2.0-cp311-cp311-emscripten_3_1_46_wasm32.whl";

export function getInlineWheelBytes() {
  return wheelBytes;
}
