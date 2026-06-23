#!/usr/bin/env bash
# Post-create setup for Codespace
# Co-authored with CoCo
set -e

echo "==> Installing backend dependencies..."
cd backend
pip install -r requirements.txt
pip install ruff pytest pytest-asyncio httpx pyright

echo "==> Installing frontend dependencies..."
cd ../frontend
npm install

echo "==> Done! Ready to develop."
