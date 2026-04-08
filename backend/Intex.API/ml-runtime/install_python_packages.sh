#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/python-packages"
REQ_FILE="${SCRIPT_DIR}/requirements.txt"

if [[ ! -f "${REQ_FILE}" ]]; then
  echo "requirements.txt not found at ${REQ_FILE}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

python3 -m pip install \
  --upgrade \
  --target "${TARGET_DIR}" \
  -r "${REQ_FILE}"

echo "Installed Python packages into ${TARGET_DIR}"
