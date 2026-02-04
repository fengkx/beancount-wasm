import wheelBytes from "../../wheels/v2/beancount-2.3.6-cp311-cp311-emscripten_3_1_46_wasm32.whl";

export const VERSION = "v2";
export const FILENAME =
  "beancount-2.3.6-cp311-cp311-emscripten_3_1_46_wasm32.whl";

export function getInlineWheelBytes() {
  return wheelBytes;
}
