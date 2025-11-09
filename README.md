# Element Screenshot Editor

A Chrome extension for capturing screenshots of specific web page elements with advanced editing capabilities.

## Features

### Element Selection
- Hover over any element to highlight it
- Click to select an element
- Use the slider to navigate up/down the DOM tree
- Precise element targeting with parent/child traversal

### Image Editing
- **Crop and resize** - Select and crop to specific areas
- **Text annotations** - Add text with customizable font and size
- **Draw arrows** - Point out important elements
- **Shapes** - Rectangle, circle, and line tools with fill options
- **Blur effect** - Privacy-protect sensitive information
- **Mosaic effect** - Pixelate areas for privacy
- **Color picker** - Choose any color for annotations
- **Stroke width** - Adjustable line thickness
- **Undo/Redo** - Full history management (up to 50 states)

### Export Options
- **Download as PNG or JPG** - High-quality image export
- **Copy to clipboard** - Quick sharing
- **Automatic filename generation** - Timestamped filenames

## Installation

### For Development
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `div-capture` directory
5. The extension icon should appear in your toolbar

## Usage

### Capturing Elements
1. Click the extension icon in your toolbar
2. Click "Start Selection" button
3. Hover over elements to see them highlighted
4. Click on an element to select it
5. Use the slider to adjust the selection (move left for parent elements, right for children)
6. Click "Capture" to take a screenshot

### Editing Screenshots
The editor will open automatically after capture with a full suite of tools:

**Available Tools** (keyboard shortcuts in parentheses):
- **Crop (C)** - Trim your screenshot to the perfect size
- **Text (T)** - Add text annotations
- **Arrow (A)** - Draw directional arrows
- **Rectangle (R)** - Draw rectangles (with fill option)
- **Circle (O)** - Draw circles (with fill option)
- **Line (L)** - Draw straight lines
- **Blur (B)** - Blur sensitive information
- **Mosaic (M)** - Pixelate areas for privacy

**Editing Controls**:
- **Color Picker** - Choose annotation colors
- **Stroke Width** - Adjust line thickness (1-20px)
- **Undo (Ctrl+Z)** - Undo last action
- **Redo (Ctrl+Y)** - Redo last undone action
- **Reset** - Restore original image

**Exporting**:
- **Copy to Clipboard** - Quick sharing via paste
- **Download PNG** - High-quality lossless format
- **Download JPG** - Compressed format for smaller file size

## Development

See [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for coding standards and workflow guidelines.

### Project Structure
```
div-capture/
├── manifest.json           # Extension manifest
├── src/
│   ├── background/        # Background service worker
│   ├── content/           # Content scripts (element selection)
│   ├── editor/            # Image editor
│   ├── popup/             # Extension popup UI
│   ├── utils/             # Utility functions
│   └── styles/            # CSS stylesheets
├── libs/                  # Third-party libraries
└── assets/                # Icons and images
```

## Technology Stack

- **Manifest V3** - Latest Chrome extension architecture
- **html2canvas** - Screenshot capture library
- **Vanilla JavaScript** - No framework dependencies
- **Canvas API** - Image editing

## Browser Compatibility

- Chrome 100+
- Edge 100+ (Chromium-based)

## License

MIT

## Contributing

Contributions are welcome! Please read [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) before submitting a pull request.

## Roadmap

- [x] Sprint 1: Element selection system ✓
- [x] Sprint 2: Basic image editor ✓
- [x] Sprint 3: Advanced editing tools ✓
- [x] Sprint 4: Save and export functionality ✓
- [ ] Sprint 5: Chrome Web Store deployment (Next)

## Keyboard Shortcuts

### Element Selection
- `ESC` - Cancel selection or deselect current element
- `↑` / `←` - Select parent element
- `↓` / `→` - Select child element

### Image Editor
- `V` - Select tool (default)
- `C` - Crop tool
- `T` - Text tool
- `A` - Arrow tool
- `R` - Rectangle tool
- `O` - Circle tool
- `L` - Line tool
- `B` - Blur tool
- `M` - Mosaic tool
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `ESC` - Deselect current tool

## Support

For issues and feature requests, please use the GitHub issue tracker.
