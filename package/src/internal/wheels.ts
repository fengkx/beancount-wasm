export type BeancountVersion = "v2" | "v3";
export type BeancountVersionInput = BeancountVersion | "2" | "3";

export const VERSIONS = ["v2", "v3"] as const;

const WHEELS: Record<
  BeancountVersion,
  { filename: string; deps: boolean }
> = {
  v2: {
    filename: "beancount-2.3.6-cp311-cp311-emscripten_3_1_46_wasm32.whl",
    deps: false,
  },
  v3: {
    filename: "beancount-3.2.0-cp311-cp311-emscripten_3_1_46_wasm32.whl",
    deps: true,
  },
};

const VERSION_ALIASES: Record<string, BeancountVersion> = {
  "2": "v2",
  v2: "v2",
  "3": "v3",
  v3: "v3",
};

export type WheelInfo = {
  version: BeancountVersion;
  filename: string;
  deps: boolean;
};

export function normalizeVersion(version: BeancountVersionInput | undefined): BeancountVersion {
  const key = String(version ?? "v3").toLowerCase();
  const normalized = VERSION_ALIASES[key];
  if (!normalized) {
    throw new Error(`Unknown beancount version: ${version}. Use "v2" or "v3".`);
  }
  return normalized;
}

export function getWheelInfo(version: BeancountVersionInput = "v3"): WheelInfo {
  const normalized = normalizeVersion(version);
  const info = WHEELS[normalized];
  return { version: normalized, filename: info.filename, deps: info.deps };
}
