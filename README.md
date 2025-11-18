# Capture div - Professional Web Capture Tool

![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/okjlpeofoihnbkjpoakccbfehalcfikb)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Capture%20div-DA552F?logo=producthunt&logoColor=white)](https://www.producthunt.com/products/capture-div)

A powerful Chrome extension for capturing screenshots of specific web page elements with professional editing capabilities. Support for multiple languages including English and Korean (한국어).

> 🎉 **Featured on Product Hunt!** Check out our [Product Hunt page](https://www.producthunt.com/products/capture-div) and show your support!

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

### From Chrome Web Store (Recommended)

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/okjlpeofoihnbkjpoakccbfehalcfikb)** ⬅️ Click to install

Simply click the link above or visit the Chrome Web Store and click "Add to Chrome" to install the extension instantly.

### Manual Installation (For Development/Testing)
1. Clone this repository:
   ```bash
   git clone https://github.com/sinam7/capture-div.git
   cd capture-div
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" toggle in the top right corner
4. Click "Load unpacked" and select the cloned `capture-div` directory
5. The extension icon should appear in your browser toolbar

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
capture-div/
├── manifest.json           # Extension manifest (v1.2.1)
├── src/
│   ├── background/        # Background service worker
│   ├── content/           # Content scripts (element selection)
│   ├── editor/            # Image editor with professional tools
│   ├── popup/             # Extension popup UI
│   ├── utils/             # Utility functions
│   └── styles/            # CSS stylesheets
├── _locales/              # Internationalization (en, ko)
│   ├── en/               # English translations
│   └── ko/               # Korean translations (한국어)
├── assets/                # Icons and images
└── DEVELOPMENT_RULES.md   # Coding standards and guidelines
```

## Technology Stack

- **Manifest V3** - Latest Chrome extension architecture with enhanced security
- **html2canvas** - High-quality screenshot capture library
- **Vanilla JavaScript** - Zero framework dependencies for optimal performance
- **Canvas API** - Professional-grade image editing capabilities
- **Chrome i18n API** - Multi-language support (English, Korean)

## Language Support

This extension supports multiple languages through Chrome's built-in internationalization system:
- **English** (en) - Default language
- **한국어** (ko) - Korean language support

The extension automatically detects your browser's language settings and displays the appropriate interface.

## Browser Compatibility

- Chrome 100+ ✅
- Edge 100+ (Chromium-based) ✅
- Other Chromium browsers (untested)

## Keyboard Shortcuts

### Element Selection
- `ESC` - Cancel selection or deselect current element
- `↑` / `←` - Select parent element
- `↓` / `→` - Select child element

### Image Editor
- `V` - Select/Move tool (default)
- `C` - Crop tool
- `P` - Add padding
- `T` - Text tool
- `A` - Arrow tool
- `R` - Rectangle tool
- `O` - Circle tool
- `L` - Line tool
- `B` - Blur tool
- `M` - Mosaic tool
- `Ctrl+Z` - Undo (up to 50 states)
- `Ctrl+Y` - Redo
- `-` / `+` - Zoom out / Zoom in
- `F` - Fit to screen
- `0` - Actual size (100%)
- `ESC` - Deselect current tool

## Recent Updates

### Version 1.2.1 (Latest)
- Improved mosaic tool coordinate handling and validation
- Enhanced coordinate clamping logic with helper method
- Bug fixes for scroll capture offset issues
- Performance optimizations

For detailed changelog, see the [commit history](https://github.com/sinam7/capture-div/commits/).

## Support

- **Issues & Bug Reports**: [GitHub Issues](https://github.com/sinam7/capture-div/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/sinam7/capture-div/issues)
- **Questions**: Check existing issues or create a new discussion

## Contributing

We welcome contributions! Before submitting a pull request:

1. Read [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for coding standards
2. Check existing issues and PRs to avoid duplication
3. Create an issue to discuss major changes
4. Follow the existing code style and conventions
5. Test your changes thoroughly

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the LICENSE file for details.

---

Made with ❤️ by the Capture div team
