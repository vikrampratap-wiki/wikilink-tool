#!/usr/bin/env bash
# =====================================================================
# विकीलिंक सहायक (WikiLink Assistant) को ब्राउज़र में खोलने की स्क्रिप्ट
# =====================================================================

DIR="$(dirname "$(readlink -f "$0")")"
FILE_PATH="$DIR/index.html"

echo "विकीलिंक सहायक उपकरण वेबसाइट आरंभ की जा रही है..."

if command -v xdg-open > /dev/null; then
    xdg-open "$FILE_PATH"
elif command -v google-chrome > /dev/null; then
    google-chrome "$FILE_PATH"
elif command -v firefox > /dev/null; then
    firefox "$FILE_PATH"
else
    python3 "$DIR/server.py"
fi
