@echo off
title Monk's Dream POS - Local Thermal Printer & Cash Drawer Bridge
cd /d "%~dp0\.."

if not exist "packages\printing\dist\localServer.js" (
  echo Building @monks/printing bridge...
  call pnpm --filter @monks/printing build
)

echo Starting Monk's Dream Windows Printer & Cash Drawer Bridge on http://127.0.0.1:12111 ...
echo Keep this window open while the counter POS is running.
node packages\printing\dist\localServer.js
pause
