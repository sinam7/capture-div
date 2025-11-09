/**
 * Text Tool - Adds text annotations to the image
 */

class TextTool extends BaseTool {
  constructor(editor) {
    super(editor);
    this.fontSize = 16;
    this.fontFamily = 'Arial';
  }

  onDrawStart(x, y) {
    // Show text input dialog
    this.showTextInput(x, y);
  }

  onDrawMove(x, y) {
    // No drawing while moving for text tool
  }

  onDrawEnd(x, y) {
    // Handled by text input
  }

  showTextInput(x, y) {
    const text = prompt('Enter text:');

    if (text && text.trim()) {
      this.drawText(text.trim(), x, y);
      this.historyManager.saveState();
    }
  }

  drawText(text, x, y) {
    const settings = this.getSettings();

    this.canvasManager.drawText(text, x, y, {
      font: `${this.fontSize}px ${this.fontFamily}`,
      fillStyle: settings.color,
      textBaseline: 'top',
    });
  }

  updateCursor() {
    this.canvas.classList.remove('cursor-default', 'cursor-move', 'cursor-text', 'cursor-crosshair');
    this.canvas.classList.add('cursor-text');
  }

  getOptionsHTML() {
    return `
      <h3>Text Tool</h3>
      <div class="editor-options__field">
        <label>Font Size:</label>
        <input type="number" id="textFontSize" min="8" max="72" value="${this.fontSize}" />
      </div>
      <div class="editor-options__field">
        <label>Font Family:</label>
        <select id="textFontFamily">
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>
    `;
  }

  attachOptionListeners() {
    const fontSizeInput = document.getElementById('textFontSize');
    const fontFamilySelect = document.getElementById('textFontFamily');

    if (fontSizeInput) {
      fontSizeInput.value = this.fontSize;
      fontSizeInput.addEventListener('change', (e) => {
        this.fontSize = parseInt(e.target.value, 10);
      });
    }

    if (fontFamilySelect) {
      fontFamilySelect.value = this.fontFamily;
      fontFamilySelect.addEventListener('change', (e) => {
        this.fontFamily = e.target.value;
      });
    }
  }
}
