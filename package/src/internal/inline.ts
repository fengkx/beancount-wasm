import type { BeancountVersion } from "./wheels.js";

export async function loadInlineWheelBytes(
  version: BeancountVersion,
): Promise<Uint8Array> {
  switch (version) {
    case "v2": {
      const module = await import("../inline/v2.js");
      return module.getInlineWheelBytes();
    }
    case "v3": {
      const module = await import("../inline/v3.js");
      return module.getInlineWheelBytes();
    }
    default: {
      const exhaustive: never = version;
      throw new Error(`Unsupported inline version: ${exhaustive}`);
    }
  }
}
