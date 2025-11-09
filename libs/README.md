# Third-Party Libraries

## html2canvas

This extension requires html2canvas v1.4.1 or later for element screenshot capture.

### Installation

Download html2canvas from one of these sources and place it as `html2canvas.min.js` in this directory:

1. **Official CDN**: https://html2canvas.hertzen.com/dist/html2canvas.min.js
2. **npm CDN**: https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js
3. **jsDelivr**: https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js

### Manual Installation Steps

```bash
# From project root
cd libs/

# Using curl
curl -O https://html2canvas.hertzen.com/dist/html2canvas.min.js

# OR using wget
wget https://html2canvas.hertzen.com/dist/html2canvas.min.js

# OR using npm
npm install html2canvas
cp node_modules/html2canvas/dist/html2canvas.min.js ./
```

### Verification

After adding the file, verify it exists:

```bash
ls -lh html2canvas.min.js
# Should show a file of approximately 170-200 KB
```

## Future Libraries

Additional libraries that may be added:

- **StackBlur** (v2.0+) - For blur effects (Sprint 3)
- **Fabric.js** (optional) - For advanced canvas editing
