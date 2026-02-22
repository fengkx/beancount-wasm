#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="release"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--profile release|debug-symbols] [v2] [v3]
EOF
}

parse_args() {
  local positional=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --profile)
        PROFILE="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        positional+=("$1")
        shift
        ;;
    esac
  done

  if [[ "$PROFILE" != "release" && "$PROFILE" != "debug-symbols" ]]; then
    echo "Invalid --profile: $PROFILE (expected release|debug-symbols)" >&2
    exit 1
  fi

  versions=("${positional[@]}")
}

build_one() {
  local version="$1"
  local subdir="$ROOT_DIR/deps/beancount-${version}"
  local image="beancount-wasm-${version}"
  local src_image="beancount-wasm-${version}-src"
  local dist_dir="$subdir/dist"
  local out_dir="$ROOT_DIR/package/wheels/${version}"

  if [[ ! -f "$subdir/Dockerfile" ]]; then
    echo "Missing Dockerfile in $subdir" >&2
    exit 1
  fi

  echo "==> Building wheel for ${version} (profile=${PROFILE})"
  docker build -t "$image" -f "$subdir/Dockerfile" "$subdir"

  # Build a source-included image to avoid host bind-mount timestamp issues.
  docker build -t "$src_image" -f - "$subdir" <<EOF_DOCKER
FROM $image
COPY . /work
WORKDIR /work
EOF_DOCKER

  mkdir -p "$out_dir"
  rm -f "$out_dir"/*.whl

  docker run --rm \
    -e "BEANCOUNT_WASM_PROFILE=${PROFILE}" \
    -v "$out_dir":/out \
    "$src_image" bash -c "./tools/build_pyodide_wasm.sh && cp dist/*emscripten*_wasm32.whl /out/"

  local wheel
  wheel=$(ls -1 "$out_dir"/*emscripten*_wasm32.whl | sort | tail -1)
  if [[ -z "$wheel" ]]; then
    echo "No wheel found in $out_dir" >&2
    exit 1
  fi

  echo "Built $(basename "$wheel") -> $out_dir (profile=${PROFILE})"
}

versions=()
parse_args "$@"
if [[ ${#versions[@]} -eq 0 ]]; then
  versions=("v2" "v3")
fi

for version in "${versions[@]}"; do
  case "$version" in
    v2|v3) build_one "$version" ;;
    *)
      echo "Unknown version: $version (expected v2 or v3)" >&2
      exit 1
      ;;
  esac
done
