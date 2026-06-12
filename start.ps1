#!/usr/bin/env bash
# Portable start script for VYRL Studio
# Works on macOS, Linux, Windows (with Git Bash or WSL)

# Prefer local node, fallback to system node
if command -v node >/dev/null 2>&1; then
  echo "Starting VYRL Studio..."
  node server.cjs
else
  echo "Error: Node.js not found. Please install Node.js."
  exit 1
fi
