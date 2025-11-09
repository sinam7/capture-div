# Development Rules - Element Screenshot Editor

## 1. Clean Architecture

### 1.1 Code Style

#### Naming Conventions
- **Files**: Use kebab-case for all files
  - ✅ `element-selector.js`, `image-editor.js`
  - ❌ `ElementSelector.js`, `imageEditor.js`

- **Classes**: Use PascalCase
  - ✅ `ElementSelector`, `ImageEditor`, `CropTool`
  - ❌ `elementSelector`, `image_editor`

- **Functions/Methods**: Use camelCase, verb-first
  - ✅ `highlightElement()`, `captureScreenshot()`, `downloadImage()`
  - ❌ `highlight_element()`, `elementHighlight()`

- **Constants**: Use UPPER_SNAKE_CASE
  - ✅ `MAX_CANVAS_SIZE`, `DEFAULT_BLUR_RADIUS`
  - ❌ `maxCanvasSize`, `defaultBlurRadius`

- **Variables**: Use camelCase, descriptive names
  - ✅ `selectedElement`, `canvasContext`, `imageData`
  - ❌ `elem`, `ctx`, `data`

- **CSS Classes**: Use BEM (Block Element Modifier)
  - ✅ `element-selector__highlight`, `editor-toolbar__button--active`
  - ❌ `highlight`, `active-button`

#### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Max 100 characters
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes for strings, except in JSON
- **Trailing Commas**: Use in multi-line arrays/objects
- **Spacing**: Space after keywords, around operators

```javascript
// ✅ Good
function captureElement(element, options = {}) {
  const { format = 'png', quality = 0.9 } = options;

  if (!element) {
    throw new Error('Element is required');
  }

  return html2canvas(element, {
    allowTaint: true,
    useCORS: true,
  });
}

// ❌ Bad
function captureElement(element,options){
const format=options.format||'png'
if(!element){throw new Error('Element is required')}
return html2canvas(element,{allowTaint:true,useCORS:true})
}
```

#### Documentation
- **JSDoc**: Required for all public functions/classes
- **Inline Comments**: Use sparingly, only for complex logic
- **README**: Update for each major feature

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

### 1.2 Avoiding Code Smells

#### DRY (Don't Repeat Yourself)
- Extract repeated logic into functions
- Use utility modules for common operations
- Create base classes for shared behavior

```javascript
// ✅ Good
class BaseTool {
  constructor(editor) {
    this.editor = editor;
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
    this.editor.setActiveTool(this);
  }

  deactivate() {
    this.isActive = false;
  }
}

class CropTool extends BaseTool {
  // Tool-specific implementation
}

// ❌ Bad - Duplicating activate/deactivate in every tool
class CropTool {
  activate() {
    this.isActive = true;
    this.editor.setActiveTool(this);
  }

  deactivate() {
    this.isActive = false;
  }
}
```

#### SOLID Principles

**Single Responsibility Principle**
- Each class/function has one clear purpose
- Separate concerns (e.g., DOM manipulation vs business logic)

```javascript
// ✅ Good
class ElementHighlighter {
  highlightElement(element) { /* ... */ }
  removeHighlight() { /* ... */ }
}

class ElementSelector {
  selectElement(element) { /* ... */ }
  getElementDepth(element) { /* ... */ }
}

// ❌ Bad - Too many responsibilities
class ElementManager {
  highlightElement(element) { /* ... */ }
  selectElement(element) { /* ... */ }
  captureElement(element) { /* ... */ }
  editImage(image) { /* ... */ }
}
```

**Open/Closed Principle**
- Open for extension, closed for modification
- Use inheritance/composition for new features

```javascript
// ✅ Good
class Tool {
  apply() { throw new Error('Must implement apply()'); }
}

class BlurTool extends Tool {
  apply() { /* blur implementation */ }
}

class MosaicTool extends Tool {
  apply() { /* mosaic implementation */ }
}
```

#### Avoid Deep Nesting
- Max 3 levels of nesting
- Use early returns
- Extract nested logic to functions

```javascript
// ✅ Good
function processElement(element) {
  if (!element) return null;
  if (!isValidElement(element)) return null;

  const data = extractData(element);
  return transformData(data);
}

// ❌ Bad
function processElement(element) {
  if (element) {
    if (isValidElement(element)) {
      const data = extractData(element);
      if (data) {
        return transformData(data);
      }
    }
  }
  return null;
}
```

#### Error Handling
- Always handle errors explicitly
- Use try-catch for async operations
- Provide meaningful error messages
- Log errors for debugging

```javascript
// ✅ Good
async function captureElement(element) {
  try {
    if (!element) {
      throw new Error('Element is required for capture');
    }

    const canvas = await html2canvas(element);
    return canvas.toDataURL();
  } catch (error) {
    console.error('Failed to capture element:', error);
    showNotification('Capture failed. Please try again.');
    throw error;
  }
}

// ❌ Bad
async function captureElement(element) {
  const canvas = await html2canvas(element);
  return canvas.toDataURL();
}
```

#### Memory Management
- Remove event listeners when done
- Clear intervals/timeouts
- Dispose of large objects

```javascript
// ✅ Good
class ElementSelector {
  activate() {
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    document.addEventListener('mousemove', this.mouseMoveHandler);
  }

  deactivate() {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    this.mouseMoveHandler = null;
    this.cleanup();
  }

  cleanup() {
    this.selectedElement = null;
    this.highlightedElement = null;
  }
}
```

### 1.3 Directory Structure

```
div-capture/
├── manifest.json                 # Extension manifest
├── README.md                     # Project documentation
├── DEVELOPMENT_RULES.md          # This file
├── .gitignore                    # Git ignore rules
│
├── src/                          # Source code
│   ├── background/               # Background scripts
│   │   └── service-worker.js    # Main service worker
│   │
│   ├── content/                  # Content scripts
│   │   ├── element-selector.js  # Element selection logic
│   │   ├── dom-traversal.js     # DOM tree navigation
│   │   ├── highlighter.js       # Visual highlighting
│   │   └── capturer.js          # Screenshot capture
│   │
│   ├── editor/                   # Image editor
│   │   ├── index.html           # Editor page
│   │   ├── editor.js            # Main editor controller
│   │   ├── canvas-manager.js    # Canvas operations
│   │   ├── history-manager.js   # Undo/redo functionality
│   │   │
│   │   └── tools/               # Editing tools
│   │       ├── base-tool.js     # Abstract base tool
│   │       ├── crop-tool.js     # Crop/resize
│   │       ├── text-tool.js     # Text annotation
│   │       ├── arrow-tool.js    # Arrow drawing
│   │       ├── shape-tool.js    # Shapes (rect, circle, line)
│   │       ├── blur-tool.js     # Blur effect
│   │       ├── mosaic-tool.js   # Mosaic effect
│   │       └── color-tool.js    # Color adjustments
│   │
│   ├── popup/                    # Extension popup
│   │   ├── popup.html           # Popup UI
│   │   ├── popup.js             # Popup logic
│   │   └── popup.css            # Popup styles
│   │
│   ├── utils/                    # Utility functions
│   │   ├── storage.js           # Chrome storage helpers
│   │   ├── messaging.js         # Message passing helpers
│   │   ├── dom-utils.js         # DOM manipulation utils
│   │   ├── image-utils.js       # Image processing utils
│   │   └── validators.js        # Input validation
│   │
│   └── styles/                   # Stylesheets
│       ├── selector.css         # Element selector styles
│       ├── editor.css           # Editor styles
│       ├── common.css           # Shared styles
│       └── variables.css        # CSS variables
│
├── libs/                         # Third-party libraries
│   ├── html2canvas.min.js       # Screenshot library
│   └── stackblur.min.js         # Blur algorithm
│
├── assets/                       # Static assets
│   ├── icons/                   # Extension icons
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   │
│   └── images/                  # UI images
│       └── toolbar-icons/       # Toolbar icons
│
└── tests/                        # Test files (future)
    ├── unit/
    └── integration/
```

#### Directory Principles
1. **Separation of Concerns**: Each directory has a single purpose
2. **Flat Structure**: Avoid deep nesting (max 3 levels)
3. **Colocation**: Keep related files together
4. **Scalability**: Easy to add new features without restructuring

---

## 2. Workflow

### 2.1 Branch Strategy

#### Branch Naming Convention
```
sprint-{number}-{brief-description}

Examples:
- sprint-1-element-selection
- sprint-2-basic-editor
- sprint-3-advanced-editing
- sprint-4-save-export
```

#### Branch per Sprint
- Create a new branch for each sprint
- Branch from `master` (or `main`)
- Keep sprints focused and manageable

```bash
# Start Sprint 1
git checkout master
git pull origin master
git checkout -b sprint-1-element-selection

# Start Sprint 2
git checkout master
git pull origin master
git checkout -b sprint-2-basic-editor
```

### 2.2 Commit Strategy

#### Commit Naming Convention
```
<type>: <brief description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- style: Code style changes (formatting, no logic change)
- docs: Documentation changes
- test: Test additions/changes
- chore: Build, config, or tooling changes

Examples:
feat: add element hover highlighting
feat: implement slider for element traversal
fix: correct element depth calculation
refactor: extract DOM utils to separate module
style: format code with consistent spacing
docs: update README with setup instructions
```

#### Commit Frequency
- **Commit early, commit often**
- Each commit = one logical change
- Aim for 5-15 commits per sprint

```bash
# Example Sprint 1 commits
git commit -m "feat: add manifest.json and basic structure"
git commit -m "feat: implement element hover detection"
git commit -m "feat: add visual highlight overlay"
git commit -m "feat: implement click to select element"
git commit -m "feat: add slider UI for element traversal"
git commit -m "feat: implement DOM depth calculation"
git commit -m "feat: implement parent/child navigation"
git commit -m "feat: integrate html2canvas for capture"
git commit -m "fix: adjust overlay positioning for scrolled pages"
git commit -m "style: format selector code with consistent style"
git commit -m "docs: add Sprint 1 implementation notes"
```

#### Commit Best Practices
- **Atomic Commits**: Each commit should be self-contained
- **Working State**: Code should work after each commit
- **Clear Messages**: Explain what and why, not how
- **No WIP**: Don't commit work-in-progress unless necessary

### 2.3 Pull Request Process

#### 1. Create Pull Request
```bash
# Push feature branch
git push -u origin sprint-1-element-selection

# Create PR via GitHub CLI or web interface
gh pr create --title "Sprint 1: Element Selection System" \
             --body "Implements element hover, selection, and DOM traversal"
```

#### PR Template
```markdown
## Sprint {number}: {Title}

### Summary
Brief description of what this sprint implements

### Features Implemented
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### Testing Done
- Tested on Chrome version X
- Tested on websites: example.com, github.com, etc.
- Manual testing scenarios

### Screenshots/Demo
(Add screenshots or GIFs if applicable)

### Checklist
- [ ] Code follows DEVELOPMENT_RULES.md
- [ ] No console errors
- [ ] All features working as expected
- [ ] Documentation updated
- [ ] Ready for review
```

#### 2. Run Gemini Code Review

```bash
# Use Gemini API or tool to review the PR
# This could be automated via GitHub Actions or manual

# Example manual process:
# 1. Get PR diff
git diff master...sprint-1-element-selection > sprint-1.diff

# 2. Submit to Gemini for review
# (Request: "Review this code for quality, bugs, and improvements")

# 3. Wait for feedback
```

#### 3. Address Review Comments

```bash
# Make fixes based on review
git checkout sprint-1-element-selection

# Make changes
vim src/content/element-selector.js

# Commit fixes
git commit -m "fix: address code review feedback on error handling"
git commit -m "refactor: improve element depth calculation efficiency"

# Push updates
git push origin sprint-1-element-selection

# Request re-review if needed
```

#### 4. Merge to Master

```bash
# After approval, merge via GitHub
# Use "Squash and Merge" for clean history

# Or via command line:
git checkout master
git pull origin master
git merge --squash sprint-1-element-selection
git commit -m "Sprint 1: Element Selection System

- Element hover highlighting
- Click to select element
- Slider for DOM traversal
- Screenshot capture integration"

git push origin master

# Delete feature branch
git branch -d sprint-1-element-selection
git push origin --delete sprint-1-element-selection
```

### 2.4 Code Review Checklist

#### Reviewer Checklist
- [ ] Code follows clean architecture rules
- [ ] No code smells (duplication, deep nesting, etc.)
- [ ] Proper error handling
- [ ] Memory leaks prevented (event listeners cleaned up)
- [ ] Comments/docs for complex logic
- [ ] Consistent naming conventions
- [ ] No console.log statements (use proper logging)
- [ ] Security considerations addressed
- [ ] Performance implications considered
- [ ] Browser compatibility verified

#### Author Checklist (Before Creating PR)
- [ ] Self-review completed
- [ ] Code formatted consistently
- [ ] All features tested manually
- [ ] No unnecessary files committed
- [ ] Documentation updated
- [ ] Commit messages clear and descriptive
- [ ] Branch up to date with master

---

## 3. Development Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ Start Sprint                                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Create branch: sprint-{n}-{description}                  │
│    git checkout -b sprint-1-element-selection               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Implement features in small increments                   │
│    - Write code following clean architecture rules          │
│    - Commit frequently (atomic commits)                     │
│    - Test after each commit                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Self-review and polish                                   │
│    - Check against code review checklist                    │
│    - Format code consistently                               │
│    - Update documentation                                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Create Pull Request                                      │
│    - Write clear PR description                             │
│    - Reference completed features                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Run Gemini Code Review                                   │
│    - Submit PR for AI review                                │
│    - Wait for feedback                                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Address Review Feedback                                  │
│    - Fix issues identified                                  │
│    - Commit fixes                                           │
│    - Request re-review if needed                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Merge to Master                                          │
│    - Use squash merge for clean history                     │
│    - Delete feature branch                                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Next Sprint (repeat cycle)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Quality Standards

### 4.1 Code Quality Metrics
- **Code Coverage**: Aim for 70%+ (when tests are implemented)
- **Complexity**: Keep cyclomatic complexity < 10 per function
- **File Size**: Max 300 lines per file (split if larger)
- **Function Length**: Max 50 lines per function

### 4.2 Performance Standards
- **Capture Time**: < 2 seconds for typical elements
- **Editor Load**: < 1 second to open editor
- **Tool Response**: < 100ms for tool activation
- **Memory**: < 50MB total extension memory

### 4.3 Browser Compatibility
- Chrome 100+
- Edge 100+ (Chromium-based)
- Test on latest 3 versions

---

## 5. Security Guidelines

### 5.1 Input Validation
- Validate all user inputs
- Sanitize text annotations
- Check file sizes before processing

### 5.2 Permissions
- Request minimum necessary permissions
- Explain permission usage to users
- No data collection or external transmission

### 5.3 Content Security Policy
- Follow Chrome's CSP requirements
- No inline scripts in HTML
- No eval() or new Function()

---

## 6. Documentation Requirements

### 6.1 Code Documentation
- JSDoc for all public APIs
- Inline comments for complex algorithms
- README for each major module

### 6.2 User Documentation
- Usage guide in README.md
- Keyboard shortcuts reference
- Troubleshooting section

### 6.3 Developer Documentation
- Architecture overview
- Setup instructions
- Contributing guidelines

---

## Appendix: Quick Reference

### File Naming
- JavaScript: `kebab-case.js`
- CSS: `kebab-case.css`
- HTML: `kebab-case.html`

### Code Naming
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Variables: `camelCase`

### Git Commands
```bash
# New sprint
git checkout -b sprint-{n}-{description}

# Commit
git commit -m "{type}: {description}"

# Push and create PR
git push -u origin sprint-{n}-{description}
gh pr create

# Merge (after approval)
git checkout master
git merge --squash sprint-{n}-{description}
git push origin master
```

### Code Style
- 2 spaces indentation
- Single quotes
- Semicolons required
- Max 100 chars per line
- BEM for CSS
