# CLAUDE.md - AI Assistant Guide

## Project Overview

**Project Name**: Element Screenshot Editor (capture-div)
**Type**: Chrome Extension (Manifest V3)
**Version**: 1.2.1
**Purpose**: A Chrome extension for capturing screenshots of specific web page elements with advanced editing capabilities
**Tech Stack**: Vanilla JavaScript, Canvas API, Chrome Extension APIs
**Status**: Production-ready, Sprints 1-4 complete

### What This Extension Does

1. **Element Selection**: Users can hover over and select specific DOM elements on any webpage
2. **Screenshot Capture**: Captures screenshots using Chrome's native API with html2canvas fallback
3. **Advanced Editing**: Provides a full-featured image editor with 8+ tools
4. **Export Options**: Download as PNG/JPG or copy to clipboard

---

## Architecture Overview

### Design Principles

This codebase follows **Clean Architecture** principles:

- **Single Responsibility Principle**: Each class/module has one clear purpose
- **DRY (Don't Repeat Yourself)**: Shared functionality in base classes and utilities
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data
- **Open/Closed Principle**: Extensible through inheritance (e.g., tool system)

### Extension Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Popup     │  │   Content    │  │  Background  │          │
│  │              │  │   Scripts    │  │   Worker     │          │
│  │  - Start UI  │  │  - Selection │  │  - Capture   │          │
│  │  - How-to    │  │  - Highlight │  │  - Storage   │          │
│  └──────────────┘  │  - Traverse  │  │  - Cleanup   │          │
│                    │  - Capture   │  └──────────────┘          │
│                    └──────────────┘                              │
│                           │                                      │
│                           ▼                                      │
│                    ┌──────────────┐                             │
│                    │    Editor    │                             │
│                    │              │                             │
│                    │  - Canvas    │                             │
│                    │  - Tools     │                             │
│                    │  - History   │                             │
│                    │  - Export    │                             │
│                    └──────────────┘                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
capture-div/
├── manifest.json                     # Extension manifest (Manifest V3)
├── README.md                         # User documentation
├── DEVELOPMENT_RULES.md              # Coding standards and workflow
├── IMPLEMENTATION_SUMMARY.md         # Sprint completion summary
├── CLAUDE.md                         # This file (AI assistant guide)
│
├── src/
│   ├── background/
│   │   └── service-worker.js         # Background service worker
│   │
│   ├── content/                      # Content scripts (injected into pages)
│   │   ├── element-selector.js       # Main selection controller
│   │   ├── highlighter.js            # Visual element highlighting
│   │   ├── dom-traversal.js          # DOM tree navigation
│   │   └── capturer.js               # Screenshot capture logic
│   │
│   ├── editor/                       # Image editor (separate page)
│   │   ├── index.html                # Editor UI
│   │   ├── editor.js                 # Main editor controller
│   │   ├── editor.css                # Editor styles
│   │   ├── canvas-manager.js         # Canvas operations
│   │   ├── history-manager.js        # Undo/redo system
│   │   │
│   │   └── tools/                    # Editing tools (polymorphic)
│   │       ├── base-tool.js          # Abstract base class
│   │       ├── move-tool.js          # Pan/move canvas
│   │       ├── crop-tool.js          # Crop functionality
│   │       ├── text-tool.js          # Text annotations
│   │       ├── arrow-tool.js         # Arrow drawing
│   │       ├── shape-tool.js         # Shapes (rect, circle, line)
│   │       ├── blur-tool.js          # Blur effect
│   │       └── mosaic-tool.js        # Mosaic/pixelation
│   │
│   ├── popup/                        # Extension popup
│   │   ├── popup.html                # Popup UI
│   │   ├── popup.js                  # Popup logic
│   │   └── popup.css                 # Popup styles
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── dom-utils.js              # DOM manipulation helpers
│   │   ├── messaging.js              # Chrome messaging API wrapper
│   │   ├── storage.js                # Chrome storage API wrapper
│   │   └── i18n.js                   # Internationalization helper
│   │
│   └── styles/
│       └── selector.css              # Element selector styles
│
├── _locales/                         # Internationalization
│   ├── en/messages.json              # English translations
│   └── ko/messages.json              # Korean translations
│
├── assets/
│   ├── icons/                        # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   │
│   └── small-promo/                  # Promotional images
│
└── libs/                             # Third-party libraries
```

---

## Key Modules and Responsibilities

### 1. Background Service Worker (`src/background/service-worker.js`)

**Purpose**: Coordinates screenshot capture and editor opening

**Key Responsibilities**:
- Listens for `captureElement`, `captureVisibleTab`, and `openEditor` messages
- Handles large image data by using `chrome.storage.local` (>40MB)
- Opens editor in new tab with captured image data
- Runs periodic cleanup of old capture data (every 5 minutes)

**Important Patterns**:
- Uses `chrome.alarms` for periodic cleanup
- Handles storage key pattern: `capture_<timestamp>_<random>`
- Implements message routing for different actions

### 2. Content Scripts (`src/content/`)

**Purpose**: Injected into web pages to handle element selection

#### `element-selector.js` (Main Controller)
- Orchestrates element selection workflow
- Manages state (active, selected element, depth)
- Handles keyboard shortcuts (ESC, arrows, Enter)
- Coordinates with highlighter, DOM traversal, and capturer
- Implements throttling for mousemove (performance optimization)

#### `highlighter.js`
- Creates visual overlay for element highlighting
- Updates highlight position on scroll/resize
- Manages tooltip with element information
- Uses absolute positioning with z-index 2147483646

#### `dom-traversal.js`
- Calculates element depth in DOM tree
- Navigates parent/child relationships
- Filters selectable elements (excludes html, body, scripts, etc.)
- Finds ancestor at specific depth

#### `capturer.js`
- Captures element screenshots
- Tries Chrome native API first (faster, more accurate)
- Falls back to html2canvas if needed
- Handles scrolling and viewport positioning

### 3. Editor (`src/editor/`)

**Purpose**: Full-featured image editing interface

#### `editor.js` (Main Controller)
- Manages editor lifecycle and state
- Coordinates tools, canvas, and history
- Handles zoom and pan
- Implements keyboard shortcuts for tools
- Manages UI updates and notifications

#### `canvas-manager.js`
- Abstracts canvas operations
- Loads images onto canvas
- Provides drawing primitives (lines, arrows, text, shapes)
- Handles blur and mosaic effects
- Manages canvas state (save/restore)

#### `history-manager.js`
- Implements undo/redo functionality
- Maintains up to 50 history states
- Stores canvas state as data URLs
- Updates UI button states

#### Tool System (`tools/`)

All tools extend `BaseTool`:

```javascript
class BaseTool {
  constructor(editor) {
    this.editor = editor;
    this.isActive = false;
  }
  activate() { /* Override */ }
  deactivate() { /* Override */ }
  handleMouseDown(e) { /* Override */ }
  handleMouseMove(e) { /* Override */ }
  handleMouseUp(e) { /* Override */ }
  handleKeyDown(e) { /* Override */ }
}
```

**Tool Implementations**:
- `MoveTool`: Pan canvas (default tool)
- `CropTool`: Two modes - edge trim and area selection
- `TextTool`: Add text with font/size customization
- `ArrowTool`: Draw directional arrows
- `ShapeTool`: Polymorphic (rectangle, circle, line)
- `BlurTool`: Canvas filter-based blur with radius control
- `MosaicTool`: Pixel averaging with block size control

### 4. Utilities (`src/utils/`)

#### `messaging.js`
- **Key Feature**: Automatically handles large image data (>40MB)
- Uses `chrome.storage.local` for large payloads to avoid message size limits
- Provides `sendToBackground()`, `sendToTab()`, `onMessage()`
- Implements cleanup for old capture data

#### `storage.js`
- Wraps `chrome.storage.local` with Promise-based API
- Provides `get()`, `set()`, `remove()`, `clear()`
- Used for temporary image storage between capture and editor

#### `i18n.js`
- Wraps `chrome.i18n.getMessage()`
- Provides fallback for missing translations
- Supports placeholder substitution

#### `dom-utils.js`
- Common DOM manipulation helpers
- Element visibility checks
- Coordinate calculations

---

## Naming Conventions

### Files
- **Format**: `kebab-case.js`
- ✅ `element-selector.js`, `canvas-manager.js`
- ❌ `ElementSelector.js`, `canvasManager.js`

### Classes
- **Format**: `PascalCase`
- ✅ `ElementSelector`, `ImageEditor`, `CropTool`
- ❌ `elementSelector`, `image_editor`

### Functions/Methods
- **Format**: `camelCase`, verb-first
- ✅ `highlightElement()`, `captureScreenshot()`, `downloadImage()`
- ❌ `highlight_element()`, `elementHighlight()`

### Constants
- **Format**: `UPPER_SNAKE_CASE`
- ✅ `MAX_CANVAS_SIZE`, `DEFAULT_BLUR_RADIUS`
- ❌ `maxCanvasSize`, `defaultBlurRadius`

### Variables
- **Format**: `camelCase`, descriptive
- ✅ `selectedElement`, `canvasContext`, `imageData`
- ❌ `elem`, `ctx`, `data`

### CSS Classes
- **Format**: BEM (Block Element Modifier)
- ✅ `element-selector__highlight`, `editor-toolbar__button--active`
- ❌ `highlight`, `active-button`

---

## Development Workflow

### Git Branch Strategy

See [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for detailed workflow.

**Branch Naming**:
```
claude/{description}-{session-id}
```

**Important**: Always develop on branches starting with `claude/` and ending with matching session ID. Push failures (403) occur if branch name doesn't match this pattern.

### Commit Convention

```
<type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- style: Code style (formatting)
- docs: Documentation
- test: Tests
- chore: Build/config

Examples:
feat: add mosaic tool with block size control
fix: correct coordinate clamping in mosaic tool
refactor: extract coordinate clamping to helper method
docs: update CLAUDE.md with architecture details
```

### Git Push/Pull Retry Logic

Network operations should retry up to 4 times with exponential backoff:
- 1st retry: 2s delay
- 2nd retry: 4s delay
- 3rd retry: 8s delay
- 4th retry: 16s delay

```bash
# Correct push command
git push -u origin <branch-name>

# Correct fetch command
git fetch origin <branch-name>
```

---

## Code Quality Standards

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Max 100 characters
- **Semicolons**: Always use
- **Quotes**: Single quotes for strings, double quotes in JSON
- **Trailing Commas**: Use in multi-line arrays/objects

### Documentation
- **JSDoc**: Required for all public functions and classes
- **Inline Comments**: Only for complex logic
- **README**: Update for major features

Example:
```javascript
/**
 * Captures a screenshot of the specified DOM element
 * @param {HTMLElement} element - The element to capture
 * @param {Object} options - Capture options
 * @param {string} [options.format='png'] - Image format (png/jpg)
 * @param {number} [options.quality=0.9] - Image quality (0-1)
 * @returns {Promise<string>} Data URL of the captured image
 * @throws {Error} If element is null or invalid
 */
async function captureElement(element, options = {}) {
  // Implementation
}
```

### Error Handling
- Always use try-catch for async operations
- Provide meaningful error messages
- Log errors for debugging
- Show user-friendly notifications

Example:
```javascript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  this.showNotification('Operation failed. Please try again.', 'error');
  throw error;
}
```

### Memory Management
- Remove event listeners in cleanup methods
- Clear intervals/timeouts
- Dispose of large objects (canvas data, image data)

Example:
```javascript
class ElementSelector {
  activate() {
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    document.addEventListener('mousemove', this.mouseMoveHandler);
  }

  deactivate() {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    this.mouseMoveHandler = null;
    this.selectedElement = null;
  }
}
```

---

## Common Development Tasks

### Adding a New Editing Tool

1. **Create tool file**: `src/editor/tools/new-tool.js`

2. **Extend BaseTool**:
```javascript
class NewTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.name = 'newTool';
  }

  activate() {
    super.activate();
    this.setupOptions();
  }

  deactivate() {
    super.deactivate();
  }

  handleMouseDown(e) {
    // Start drawing
  }

  handleMouseMove(e) {
    // Update preview
  }

  handleMouseUp(e) {
    // Finalize drawing
    this.editor.historyManager.saveState(); // IMPORTANT: Save to history
  }
}
```

3. **Register in editor**: Add to `src/editor/editor.js`:
```javascript
this.tools = {
  // ... existing tools
  newTool: new NewTool(this),
};
```

4. **Add UI button**: Update `src/editor/index.html`:
```html
<button data-tool="newTool" title="New Tool (N)">
  <span>New</span>
</button>
```

5. **Add i18n strings**: Update `_locales/en/messages.json`:
```json
{
  "toolNewTool": {
    "message": "New Tool",
    "description": "New tool"
  }
}
```

6. **Add keyboard shortcut**: In `editor.js`:
```javascript
setupKeyboardShortcuts() {
  // ...
  case 'n':
  case 'N':
    this.activateTool('newTool');
    break;
}
```

### Modifying Element Selection Behavior

**File**: `src/content/element-selector.js`

Key methods:
- `handleMouseMove()`: Update hover highlighting logic
- `handleClick()`: Modify selection logic
- `handleKeyDown()`: Add keyboard shortcuts
- `showSlider()`: Customize slider UI

### Adding Messaging Between Components

**Pattern**:
```javascript
// From content script to background
const response = await Messaging.sendToBackground({
  action: 'myAction',
  data: { /* ... */ }
});

// From background to content script
const response = await Messaging.sendToTab(tabId, {
  action: 'myAction',
  data: { /* ... */ }
});

// Listen in background
Messaging.onMessage(async (message, sender, sendResponse) => {
  if (message.action === 'myAction') {
    const result = await handleMyAction(message.data);
    sendResponse({ success: true, result });
    return true; // Keep channel open for async
  }
});
```

**Important**: For large image data (>40MB), `Messaging.sendToBackground()` automatically uses `chrome.storage.local`.

### Modifying Canvas Operations

**File**: `src/editor/canvas-manager.js`

**Pattern**:
```javascript
// Always save/restore canvas state for transformations
this.ctx.save();
this.ctx.translate(x, y);
this.ctx.rotate(angle);
// ... drawing operations
this.ctx.restore();

// For pixel manipulation
const imageData = this.ctx.getImageData(x, y, width, height);
const pixels = imageData.data; // Uint8ClampedArray [r, g, b, a, r, g, b, a, ...]

for (let i = 0; i < pixels.length; i += 4) {
  pixels[i] = newR;     // Red
  pixels[i + 1] = newG; // Green
  pixels[i + 2] = newB; // Blue
  pixels[i + 3] = newA; // Alpha
}

this.ctx.putImageData(imageData, x, y);
```

### Adding History Support to Operations

**Always call** `this.editor.historyManager.saveState()` after operations that modify the canvas:

```javascript
handleMouseUp(e) {
  // Apply your changes to canvas
  this.applyChanges();

  // CRITICAL: Save to history for undo/redo
  this.editor.historyManager.saveState();
}
```

---

## Testing Guidelines

### Manual Testing Checklist

**Element Selection**:
- [ ] Hover highlights elements correctly
- [ ] Click selects element
- [ ] Slider adjusts DOM depth
- [ ] Keyboard shortcuts work (ESC, arrows, Enter)
- [ ] Works on complex sites (Gmail, GitHub, etc.)
- [ ] Works on scrolled pages

**Editor Tools**:
- [ ] All tools activate/deactivate correctly
- [ ] Tool keyboard shortcuts work
- [ ] Color picker changes annotation colors
- [ ] Stroke width affects drawing
- [ ] Tools respect canvas boundaries

**History**:
- [ ] Undo (Ctrl+Z) works for all operations
- [ ] Redo (Ctrl+Y) works correctly
- [ ] Button states update appropriately
- [ ] History limit (50 states) respected

**Export**:
- [ ] PNG download produces correct file
- [ ] JPG download produces correct file
- [ ] Copy to clipboard works
- [ ] Filenames are timestamped correctly

**Performance**:
- [ ] Large images (1920x1080+) load quickly
- [ ] Multiple undo/redo operations are fast
- [ ] Canvas operations are smooth
- [ ] Memory usage is reasonable

**Cross-Browser**:
- [ ] Chrome latest
- [ ] Chrome 2 versions back
- [ ] Edge latest

---

## Important APIs and Patterns

### Chrome Extension APIs Used

- `chrome.runtime.sendMessage()` - Message passing
- `chrome.tabs.sendMessage()` - Send to content scripts
- `chrome.tabs.captureVisibleTab()` - Native screenshot API
- `chrome.storage.local` - Temporary image storage
- `chrome.alarms` - Periodic cleanup
- `chrome.i18n.getMessage()` - Internationalization

### Canvas API Patterns

**Drawing Primitives**:
```javascript
// Line
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();

// Rectangle
ctx.strokeRect(x, y, width, height);
ctx.fillRect(x, y, width, height);

// Circle
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.stroke();

// Text
ctx.font = '16px Arial';
ctx.fillText('Text', x, y);

// Arrow (custom implementation)
canvasManager.drawArrow(x1, y1, x2, y2, color, width);
```

**Image Manipulation**:
```javascript
// Load image
const img = new Image();
img.onload = () => ctx.drawImage(img, 0, 0);
img.src = dataUrl;

// Get pixel data
const imageData = ctx.getImageData(x, y, width, height);

// Apply filter (blur)
ctx.filter = 'blur(10px)';
ctx.drawImage(canvas, 0, 0);
ctx.filter = 'none';

// Export
const dataUrl = canvas.toDataURL('image/png');
canvas.toBlob((blob) => { /* ... */ }, 'image/jpeg', 0.9);
```

---

## Internationalization (i18n)

### Adding New Translations

1. **Add to `_locales/en/messages.json`**:
```json
{
  "myNewString": {
    "message": "Hello $1!",
    "description": "Greeting message",
    "placeholders": {
      "name": {
        "content": "$1"
      }
    }
  }
}
```

2. **Use in code**:
```javascript
// Without placeholders
const message = getMessage('myNewString');

// With placeholders
const message = getMessage('myNewString', 'World');
```

3. **Use in HTML** (manifest.json strings only):
```json
{
  "extName": {
    "message": "My Extension",
    "description": "Extension name"
  }
}
```
```json
// manifest.json
{
  "name": "__MSG_extName__"
}
```

---

## Common Pitfalls and Solutions

### 1. Large Image Data in Messages

**Problem**: `chrome.runtime.sendMessage()` has a size limit (~64MB in practice, but varies).

**Solution**: Use `Messaging.sendToBackground()` which automatically uses `chrome.storage.local` for large payloads (>40MB).

```javascript
// ✅ Correct (handles large data automatically)
const response = await Messaging.sendToBackground({
  action: 'openEditor',
  imageData: largeDataUrl // Can be >100MB
});

// ❌ Wrong (may fail for large images)
chrome.runtime.sendMessage({
  action: 'openEditor',
  imageData: largeDataUrl
});
```

### 2. Canvas State Not Saved

**Problem**: Transformations affect subsequent drawing operations.

**Solution**: Always use `save()` and `restore()`.

```javascript
// ✅ Correct
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.fillRect(0, 0, 50, 50);
ctx.restore(); // Restore previous state

// ❌ Wrong (affects subsequent draws)
ctx.translate(x, y);
ctx.fillRect(0, 0, 50, 50);
// No restore - translation persists!
```

### 3. Forgetting History Save

**Problem**: Changes not undoable.

**Solution**: Call `historyManager.saveState()` after canvas modifications.

```javascript
// ✅ Correct
applyBlur() {
  // Modify canvas
  this.canvasManager.applyBlur(x, y, radius);

  // Save to history
  this.editor.historyManager.saveState(); // CRITICAL
}

// ❌ Wrong (can't undo)
applyBlur() {
  this.canvasManager.applyBlur(x, y, radius);
  // Missing saveState()!
}
```

### 4. Event Listener Memory Leaks

**Problem**: Event listeners not removed, causing memory leaks.

**Solution**: Store bound handlers and remove them in cleanup.

```javascript
// ✅ Correct
class MyClass {
  activate() {
    this.handleClick = this.handleClick.bind(this);
    document.addEventListener('click', this.handleClick);
  }

  deactivate() {
    document.removeEventListener('click', this.handleClick);
    this.handleClick = null;
  }
}

// ❌ Wrong (memory leak)
class MyClass {
  activate() {
    document.addEventListener('click', (e) => this.handleClick(e));
  }

  deactivate() {
    // Can't remove - no reference to handler!
  }
}
```

### 5. Coordinate System Confusion

**Problem**: Mouse coordinates don't match canvas coordinates (due to zoom/pan).

**Solution**: Always convert using `getBoundingClientRect()` and account for zoom/pan.

```javascript
// ✅ Correct
getCanvasCoordinates(e) {
  const rect = this.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - this.translateX) / this.zoom;
  const y = (e.clientY - rect.top - this.translateY) / this.zoom;
  return { x, y };
}

// ❌ Wrong (ignores zoom/pan)
getCanvasCoordinates(e) {
  return { x: e.clientX, y: e.clientY };
}
```

### 6. Mosaic/Blur Tool Coordinate Clamping

**Problem**: Coordinates can go out of bounds, causing errors.

**Solution**: Always clamp coordinates to canvas bounds.

```javascript
// ✅ Correct (from mosaic-tool.js)
const clampedX = Math.max(0, Math.min(Math.floor(x), width - 1));
const clampedY = Math.max(0, Math.min(Math.floor(y), height - 1));

// ❌ Wrong
const pixelX = Math.floor(x);
const pixelY = Math.floor(y);
// Can be negative or out of bounds!
```

---

## Performance Optimization

### Throttling Mouse Events

For performance on complex pages, throttle `mousemove` events:

```javascript
handleMouseMove(event) {
  if (this.mouseMoveTimeout) {
    return; // Skip this event
  }

  this.mouseMoveTimeout = setTimeout(() => {
    this.mouseMoveTimeout = null;
  }, this.throttleDelay); // 16ms ≈ 60fps

  // Process event
  this.updateHighlight(event);
}
```

### Canvas Performance

- Use `requestAnimationFrame()` for animations
- Minimize `getImageData()` / `putImageData()` calls (expensive)
- Cache frequently used values (canvas size, rect, etc.)
- Clear canvas efficiently: `ctx.clearRect()` instead of resetting width

### Storage Cleanup

The service worker runs periodic cleanup of old capture data every 5 minutes:

```javascript
// Removes capture_* keys older than 5 minutes
chrome.alarms.create('cleanupCaptureData', { periodInMinutes: 5 });
```

---

## Security Considerations

### Content Security Policy (CSP)

- **No inline scripts** in HTML
- **No `eval()` or `new Function()`**
- All scripts loaded via `<script src="">`

### Input Validation

- Sanitize text input before drawing to canvas
- Validate numeric inputs (blur radius, stroke width, etc.)
- Check file sizes before processing

### Permissions

Minimal permissions requested:
- `activeTab`: Access current tab for capture
- `tabs`: Required for tab operations
- `clipboardWrite`: Copy images
- `storage`: Temporary image storage
- `unlimitedStorage`: Large images
- `alarms`: Periodic cleanup
- `<all_urls>`: Required for content scripts

**No data collection or external transmission**.

---

## Deployment Checklist

Before releasing a new version:

- [ ] Update version in `manifest.json`
- [ ] Test on clean Chrome installation
- [ ] Test on multiple websites (complex sites like Gmail, GitHub)
- [ ] Test all tools and features
- [ ] Remove all `console.log` statements (or use conditional logging)
- [ ] Update README if features changed
- [ ] Update IMPLEMENTATION_SUMMARY.md if needed
- [ ] Run through manual testing checklist
- [ ] Verify icons and assets are optimized
- [ ] Test on Chrome stable and Edge
- [ ] Create git tag for release

---

## Quick Reference

### File Locations

| Feature | File |
|---------|------|
| Element selection | `src/content/element-selector.js` |
| Highlighting | `src/content/highlighter.js` |
| DOM traversal | `src/content/dom-traversal.js` |
| Screenshot capture | `src/content/capturer.js` |
| Background worker | `src/background/service-worker.js` |
| Editor main | `src/editor/editor.js` |
| Canvas operations | `src/editor/canvas-manager.js` |
| Undo/redo | `src/editor/history-manager.js` |
| Tool base class | `src/editor/tools/base-tool.js` |
| Messaging utility | `src/utils/messaging.js` |
| Storage utility | `src/utils/storage.js` |
| i18n utility | `src/utils/i18n.js` |
| DOM utilities | `src/utils/dom-utils.js` |

### Keyboard Shortcuts

**Element Selection**:
- `ESC` - Cancel/deselect
- `↑` / `←` - Select parent
- `↓` / `→` - Select child
- `Enter` - Capture selected element

**Editor**:
- `V` - Move tool
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
- `F` - Fit to screen
- `0` - Actual size (100%)
- `+` - Zoom in
- `-` - Zoom out
- `ESC` - Deselect tool

### Message Actions

| Action | Direction | Purpose |
|--------|-----------|---------|
| `startSelection` | Popup → Content | Start element selection mode |
| `stopSelection` | Popup → Content | Stop element selection mode |
| `captureElement` | Content → Background | Capture selected element |
| `captureVisibleTab` | Content → Background | Capture visible area |
| `openEditor` | Content/Background → Background | Open editor with image |

---

## Additional Resources

- **DEVELOPMENT_RULES.md**: Detailed coding standards and workflow
- **README.md**: User-facing documentation
- **IMPLEMENTATION_SUMMARY.md**: Sprint completion summary
- **manifest.json**: Extension configuration
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/

---

## Questions or Issues?

When encountering issues:

1. **Check console logs** in relevant context (popup, content, background, editor)
2. **Verify message flow** between components
3. **Check storage** using Chrome DevTools → Application → Storage
4. **Review recent commits** for related changes
5. **Test on simple page** to isolate issue
6. **Refer to DEVELOPMENT_RULES.md** for coding standards

---

**Last Updated**: 2025-11-18
**Version**: 1.2.1
**Maintained by**: AI assistants working on capture-div
