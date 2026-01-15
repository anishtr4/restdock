#!/bin/bash
set -e

# Define directories
ICONSET_DIR="src-tauri/icons.iconset"
ICONS_DIR="src-tauri/icons"
SOURCE="$ICONS_DIR/icon.png"

echo "Creating temporary iconset directory..."
mkdir -p "$ICONSET_DIR"

echo "Generating standard iconset sizes from $SOURCE..."
sips -s format png -z 16 16     "$SOURCE" --out "$ICONSET_DIR/icon_16x16.png"
sips -s format png -z 32 32     "$SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -s format png -z 32 32     "$SOURCE" --out "$ICONSET_DIR/icon_32x32.png"
sips -s format png -z 64 64     "$SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -s format png -z 128 128   "$SOURCE" --out "$ICONSET_DIR/icon_128x128.png"
sips -s format png -z 256 256   "$SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -s format png -z 256 256   "$SOURCE" --out "$ICONSET_DIR/icon_256x256.png"
sips -s format png -z 512 512   "$SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -s format png -z 512 512   "$SOURCE" --out "$ICONSET_DIR/icon_512x512.png"
sips -s format png -z 1024 1024 "$SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png"

echo "Generating .icns file..."
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"

echo "Updating individual PNG files required by Tauri..."
# Overwrite specific sizes used in tauri.conf.json
sips -z 32 32     "$SOURCE" --out "$ICONS_DIR/32x32.png"
sips -z 128 128   "$SOURCE" --out "$ICONS_DIR/128x128.png"
sips -z 256 256   "$SOURCE" --out "$ICONS_DIR/128x128@2x.png"
sips -z 64 64     "$SOURCE" --out "$ICONS_DIR/64x64.png"

echo "Cleanup..."
rm -rf "$ICONSET_DIR"

echo "Icon update complete!"
