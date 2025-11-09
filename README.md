# Element Screenshot Editor

A Chrome extension for capturing screenshots of specific web page elements with advanced editing capabilities.

## Features

### Element Selection
- Hover over any element to highlight it
- Click to select an element
- Use the slider to navigate up/down the DOM tree
- Precise element targeting with parent/child traversal

### Image Editing (Coming Soon)
- Crop and resize
- Add text annotations
- Draw arrows and shapes
- Apply blur and mosaic effects
- Adjust colors and brightness
- Undo/Redo support

### Export Options (Coming Soon)
- Download as PNG or JPG
- Copy to clipboard
- Automatic filename generation

## Installation

### For Development
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `div-capture` directory
5. The extension icon should appear in your toolbar

## Usage

1. Click the extension icon in your toolbar
2. Click "Start Selection" button
3. Hover over elements to see them highlighted
4. Click on an element to select it
5. Use the slider to adjust the selection (move left for parent elements, right for children)
6. Click "Capture" to take a screenshot
7. Edit your screenshot in the editor (coming soon)
8. Save or copy to clipboard (coming soon)

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

- [x] Sprint 1: Element selection system (In Progress)
- [ ] Sprint 2: Basic image editor
- [ ] Sprint 3: Advanced editing tools
- [ ] Sprint 4: Save and export functionality
- [ ] Sprint 5: Chrome Web Store deployment

## Support

For issues and feature requests, please use the GitHub issue tracker.
