# Extension Icons

This directory should contain the following icon files:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Temporary Solution

For development purposes, you can create simple placeholder icons using any image editor or online tool.

## Recommended Tools

- **Figma** - Free online design tool
- **GIMP** - Free image editor
- **Photoshop** - Professional image editor
- **Online Icon Generators** - Various free tools available

## Design Guidelines

- Use a camera or screenshot icon theme
- Colors: Blue (#4285f4) with white or transparent background
- Keep it simple and recognizable
- Ensure good contrast for toolbar visibility

## Quick Command (ImageMagick)

If you have ImageMagick installed:

```bash
# Create simple placeholder icons (requires ImageMagick)
convert -size 16x16 xc:#4285f4 icon16.png
convert -size 48x48 xc:#4285f4 icon48.png
convert -size 128x128 xc:#4285f4 icon128.png
```

For a better placeholder with text:

```bash
convert -size 128x128 xc:#4285f4 -pointsize 60 -fill white \
  -gravity center -annotate +0+0 "📸" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```
