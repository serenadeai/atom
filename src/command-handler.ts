import * as fs from "fs";
import * as globby from "globby";
import App from "./app";
import BaseCommandHandler from "./shared/command-handler";
import * as diff from "./shared/diff";
import Settings from "./shared/settings";

declare var atom: any;

export default class CommandHandler extends BaseCommandHandler {
  private activeEditor: any = atom.workspace.getActiveTextEditor();
  private openFileList: any[] = [];

  private dispatch(command: string) {
    let view = atom.workspace.getActivePane();
    if (this.activeEditor) {
      view = atom.views.getView(this.activeEditor);
    }

    atom.commands.dispatch(view, command);
  }

  private filenameForEditor(editor: any): string {
    let filename = editor.getPath();
    const known = ["js", "jsx", "vue", "ts", "tsx", "java", "py", "html", "css", "less", "scss"];
    for (const extension of known) {
      if (filename.endsWith(`.${extension}`)) {
        return filename;
      }
    }

    const scopes = editor.getRootScopeDescriptor().scopes;
    if (scopes.length === 0) {
      return filename;
    }

    if (!filename) {
      filename = "file";
    }

    const scopeToFilename: { [key: string]: string } = {
      "source.css": `${filename}.css`,
      "text.html": `${filename}.html`,
      "source.java": `${filename}.java`,
      "source.js": `${filename}.js`,
      "source.css.less": `${filename}.css`,
      "source.python": `${filename}.py`,
      "source.css.scss": `${filename}.css`,
      "source.ts": `${filename}.ts`,
      "source.tsx": `${filename}.tsx`
    };

    for (const k of Object.keys(scopeToFilename)) {
      if (scopes[0].includes(k)) {
        return scopeToFilename[k];
      }
    }

    return filename;
  }

  async focus(): Promise<any> {
    if (this.activeEditor) {
      atom.workspace.paneForItem(this.activeEditor!)!.activate();
    }
  }

  getActiveEditorText(): string | undefined {
    if (!this.activeEditor) {
      return undefined;
    }

    return this.activeEditor!.getText();
  }

  highlightRanges(ranges: diff.DiffRange[]): number {
    const duration = 200;
    const steps = [1, 2, 1];
    const step = duration / steps.length;
    if (!this.activeEditor || ranges.length == 0) {
      return 0;
    }

    for (let range of ranges) {
      for (let i = 0; i < steps.length; i++) {
        setTimeout(() => {
          const marker = this.activeEditor!.markBufferRange([range.start, range.stop]);
          this.activeEditor!.decorateMarker(marker, {
            type: "highlight",
            class:
              range.diffRangeType == diff.DiffRangeType.Delete
                ? `error-color-${steps[i]}`
                : `success-color-${steps[i]}`
          });
          setTimeout(() => {
            marker.destroy();
          }, step);
        }, i * step);
      }
    }

    return 250;
  }

  pollActiveEditor() {
    setInterval(() => {
      this.reloadActiveEditor();
    }, 1000);
  }

  reloadActiveEditor() {
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }

    this.activeEditor = editor;
  }

  async scrollToCursor(): Promise<any> {}

  select(startRow: number, startColumn: number, endRow: number, endColumn: number) {
    if (!this.activeEditor) {
      return;
    }

    this.activeEditor!.setSelectedBufferRange([
      [startRow, startColumn],
      [endRow, endColumn]
    ]);
  }

  setSourceAndCursor(_before: string, source: string, row: number, column: number) {
    if (!this.activeEditor) {
      return;
    }

    // set the text and the cursor in the same transcation, so undo/redo use the correct cursor position
    this.activeEditor!.transact(() => {
      this.activeEditor!.setText(source);
      this.activeEditor!.setCursorBufferPosition([row, column]);
    });
  }

  async uiDelay() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 300);
    });
  }

  async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<any> {
    atom.workspace.getActivePane().destroyActiveItem();
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_CLOSE_WINDOW(_data: any): Promise<any> {
    this.dispatch("pane:close");
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_COPY(data: any): Promise<any> {
    if (data && data.text) {
      atom.clipboard.write(data.text);
    }
  }

  async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
    await this.focus();
    atom.workspace.open();
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_GET_EDITOR_STATE(_data: any): Promise<any> {
    let result = {
      source: "",
      cursor: 0,
      filename: "",
      files: this.openFileList,
      roots: atom.project.getPaths()
    };

    if (!this.activeEditor) {
      return result;
    }

    let position = this.activeEditor!.getCursorBufferPosition();
    let row = position.row;
    let column = position.column;
    let text = this.activeEditor!.getText();

    // iterate through text, incrementing rows when newlines are found, and counting columns when row is right
    let cursor = 0;
    let currentRow = 0;
    let currentColumn = 0;
    for (let i = 0; i < text.length; i++) {
      if (currentRow == row) {
        if (currentColumn == column) {
          break;
        }

        currentColumn++;
      }

      if (text[i] == "\n") {
        currentRow++;
      }

      cursor++;
    }

    result.source = text;
    result.cursor = cursor;
    result.filename = this.filenameForEditor(this.activeEditor!);
    return {
      message: "editorState",
      data: result
    };
  }

  async COMMAND_TYPE_GO_TO_DEFINITION(_data: any): Promise<any> {}

  async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
    await this.focus();
    atom.workspace.getActivePane().activateNextItem();
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_OPEN_FILE(data: any): Promise<any> {
    atom.workspace.open(this.openFileList[data.index || 0]);
  }

  async COMMAND_TYPE_OPEN_FILE_LIST(data: any): Promise<any> {
    // we want to look for any substring match, so replace spaces with wildcard
    const search = "**" + data.path.toLowerCase().replace(/ /g, "**") + "**";

    this.openFileList = [];
    for (const e of atom.project.getDirectories()) {
      this.openFileList.push(
        ...globby.sync([search], {
          cwd: e.getPath(),
          absolute: true,
          caseSensitiveMatch: false,
          baseNameMatch: true,
          gitignore: true
        })
      );
    }

    return {
      message: "sendText",
      data: {
        text: `callback open`
      }
    };
  }

  async COMMAND_TYPE_PASTE(data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    let text = atom.clipboard.read();
    let source = this.activeEditor!.getText();
    this.pasteText(source, data, text);
  }

  async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
    await this.focus();
    atom.workspace.getActivePane().activatePreviousItem();
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_REDO(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    this.activeEditor!.redo();
  }

  async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    if (this.activeEditor!.getPath()) {
      this.activeEditor!.save();
    } else {
      let path = atom.applicationDelegate.showSaveDialog();
      if (path) {
        this.activeEditor!.saveAs(path);
      }
    }
  }

  async COMMAND_TYPE_SPLIT(data: any): Promise<any> {
    await this.focus();
    this.dispatch("pane:split-" + data.direction + "-and-copy-active-item");
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
    let index = data.index - 1;
    if (index < 0) {
      index = atom.workspace.getActivePane().getItems().length - 1;
    }

    await this.focus();
    atom.workspace.getActivePane().activateItemAtIndex(index);
    await this.uiDelay();
    this.reloadActiveEditor();
  }

  async COMMAND_TYPE_UNDO(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    this.activeEditor!.undo();
  }

  async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
    await this.focus();

    let commands: any = { left: "on-left", right: "on-right", up: "above", down: "below" };
    this.dispatch("window:focus-pane-" + commands[data.direction]);
    await this.uiDelay();
    this.reloadActiveEditor();
  }
}
