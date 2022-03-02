import * as fs from "fs";
import * as globby from "globby";
import App from "./app";
import Settings from "./settings";
import * as diff from "./diff";
import { TextEditor } from "atom";

declare var atom: any;

export default class CommandHandler {
  private activeEditor: TextEditor | undefined = atom.workspace.getActiveTextEditor();
  private openFileList: any[] = [];
  private scopeToExtension: { [key: string]: string[] } = {
    "source.c": ["c", "h"],
    "source.cpp": ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "c", "h"],
    "source.c++": ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "c", "h"],
    "source.css": ["css", "scss"],
    "source.scss": ["css", "scss"],
    "source.go": ["go"],
    "text.html": ["html", "vue", "svelte"],
    "text.html.basic": ["html", "vue", "svelte"],
    "source.java": ["java"],
    "source.js": ["js", "jsx"],
    "source.python": ["py"],
    "source.ruby": ["rb"],
    "source.rust": ["rs"],
    "source.shell": ["sh", "bash"],
    "source.ts": ["ts", "tsx"],
    "source.tsx": ["tsx", "ts"],
  };

  constructor(private settings: Settings) {}

  private dispatch(command: string) {
    let view = atom.workspace.getActivePane();
    if (this.activeEditor) {
      view = atom.views.getView(this.activeEditor);
    }

    atom.commands.dispatch(view, command);
  }

  private focus() {
    if (this.activeEditor) {
      atom.workspace.paneForItem(this.activeEditor)!.activate();
    }
  }

  private highlightRanges(ranges: diff.DiffRange[]): number {
    const duration = 200;
    const steps = [1, 2, 1];
    const step = duration / steps.length;
    if (!this.activeEditor || ranges.length == 0) {
      return 0;
    }

    for (const range of ranges) {
      for (let i = 0; i < steps.length; i++) {
        setTimeout(() => {
          if (this.activeEditor) {
            const marker = this.activeEditor.markBufferRange([range.start, range.stop]);
            this.activeEditor.decorateMarker(marker, {
              type: "highlight",
              class:
                range.diffRangeType == diff.DiffRangeType.Delete
                  ? `error-color-${steps[i]}`
                  : `success-color-${steps[i]}`,
            });
            setTimeout(() => {
              marker.destroy();
            }, step);
          }
        }, i * step);
      }
    }

    return 250;
  }

  private rowAndColumnToCursor(row: number, column: number, text: string) {
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

    return cursor;
  }

  private setSourceAndCursor(source: string, row: number, column: number) {
    if (!this.activeEditor) {
      return;
    }

    // set the text and the cursor in the same transcation, so undo/redo use the correct cursor position
    this.activeEditor.transact(() => {
      this.activeEditor!.setText(source);
      this.activeEditor!.setCursorBufferPosition([row, column]);
    });
  }

  private uiDelay(timeout: number = 300): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, timeout);
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

  async COMMAND_TYPE_DIFF(data: any): Promise<any> {
    await this.focus();
    if (!this.activeEditor) {
      return;
    }

    const before = this.activeEditor.getText() || "";
    const [row, column] = diff.cursorToRowAndColumn(data.source, data.cursor);
    if (!this.settings.getAnimations()) {
      this.setSourceAndCursor(data.source, row, column);
      return;
    }

    let ranges = diff.diff(before, data.source);
    if (ranges.length == 0) {
      ranges = [
        new diff.DiffRange(
          diff.DiffRangeType.Add,
          diff.DiffHighlightType.Line,
          new diff.DiffPoint(row, 0),
          new diff.DiffPoint(row + 1, 0)
        ),
      ];
    }

    const addRanges = ranges.filter(
      (e: diff.DiffRange) => e.diffRangeType == diff.DiffRangeType.Add
    );

    const deleteRanges = ranges.filter(
      (e: diff.DiffRange) => e.diffRangeType == diff.DiffRangeType.Delete
    );

    const timeout = this.highlightRanges(deleteRanges);
    return new Promise((resolve) => {
      setTimeout(
        async () => {
          this.setSourceAndCursor(data.source, row, column);
          this.highlightRanges(addRanges);
          resolve(null);
        },
        deleteRanges.length > 0 ? timeout : 1
      );
    });
  }

  async COMMAND_TYPE_GET_EDITOR_STATE(data: any): Promise<any> {
    let result: any = {
      message: "editorState",
      data: {
        source: "",
        cursor: 0,
        selectionStart: 0,
        selectionEnd: 0,
        filename: "",
        files: this.openFileList,
        roots: atom.project.getPaths(),
        tabs: atom.workspace
          .getActivePane()
          .getItems()
          .map((e: any) => e.getTitle()),
      },
    };

    if (!this.activeEditor) {
      return result;
    }

    let filename = this.activeEditor.getPath() || "";
    const scope = this.activeEditor.getGrammar().scopeName;
    if (scope && this.scopeToExtension[scope]) {
      if (!this.scopeToExtension[scope].some((e: string) => filename.endsWith(`.${e}`))) {
        filename = (filename || "file") + `.${this.scopeToExtension[scope][0]}`;
      }
    }

    result.data.filename = filename;
    if (data.limited) {
      return result;
    }

    const source = this.activeEditor.getText();
    const cursor = this.activeEditor.getCursorBufferPosition();
    const selectionStart = this.activeEditor.getSelectedBufferRange().start;
    const selectionEnd = this.activeEditor.getSelectedBufferRange().end;
    result.data.selectionStart = this.rowAndColumnToCursor(
      selectionStart.row,
      selectionStart.column,
      source
    );
    result.data.selectionEnd = this.rowAndColumnToCursor(
      selectionEnd.row,
      selectionEnd.column,
      source
    );

    if (result.data.selectionStart == result.data.selectionEnd) {
      result.data.selectionStart = 0;
      result.data.selectionEnd = 0;
    }

    result.data.source = source;
    result.data.cursor = this.rowAndColumnToCursor(cursor.row, cursor.column, source);
    result.data.available = true;
    result.data.canGetState = true;
    result.data.canSetState = true;
    return result;
  }

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
          gitignore: true,
        })
      );
    }

    return { message: "sendText", data: { text: "callback open" } };
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

    this.activeEditor.redo();
  }

  async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    if (this.activeEditor.getPath()) {
      return this.activeEditor.save();
    } else {
      return atom.applicationDelegate.showSaveDialog().then((data: any) => {
        if (!data.canceled) {
          this.activeEditor!.saveAs(data.filePath);
        }
      });
    }
  }

  async COMMAND_TYPE_SELECT(data: any): Promise<any> {
    if (!this.activeEditor) {
      return;
    }

    const [startRow, startColumn] = diff.cursorToRowAndColumn(data.source, data.cursor);
    const [endRow, endColumn] = diff.cursorToRowAndColumn(data.source, data.cursorEnd);
    this.activeEditor.setSelectedBufferRange([
      [startRow, startColumn],
      [endRow, endColumn],
    ]);
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

    this.activeEditor.undo();
  }

  async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
    await this.focus();

    let commands: any = { left: "on-left", right: "on-right", up: "above", down: "below" };
    this.dispatch("window:focus-pane-" + commands[data.direction]);
    await this.uiDelay();
    this.reloadActiveEditor();
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
}
