'use babel';

import Applescript from './applescript';

export default class CommandHandler {
    constructor(delegate) {
        this.delegate = delegate;
    }

    _dispatch(command) {
        let view = atom.workspace.getActivePane();
        let editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            view = atom.views.getView(editor);
        }

        atom.commands.dispatch(view, command);
    }

    _moveCursor(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        // iterate until the given substring index, incrementing rows and columns as we go
        let text = editor.getText();
        let row = 0;
        let column = 0;
        for (let i = 0; i < data.cursor; i++) {
            column++;
            if (text[i] == "\n") {
                row++;
                column = 0;
            }
        }

        editor.setCursorBufferPosition([row, column]);
    }

    async _uiDelay() {
        // wait enough time for UI updates to actually happen
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }

    async COMMAND_TYPE_CANCEL(data) {
        this.delegate.showSuggestions();
    }

    async COMMAND_TYPE_CLOSE_TAB(data) {
        atom.workspace.getActivePane().destroyActiveItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_CLOSE_WINDOW(data) {
        this._dispatch('pane:close');
        await this._uiDelay();
    }

    async COMMAND_TYPE_COPY(data) {
        atom.clipboard.write(data.text);
    }

    async COMMAND_TYPE_CREATE_TAB(data) {
        atom.workspace.open();
        await this._uiDelay();
    }

    async COMMAND_TYPE_DIFF(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        atom.workspace.getActiveTextEditor().setText(data.source);
        this._moveCursor(data);
    }

    async COMMAND_TYPE_GET_EDITOR_STATE(data) {
        let result = {
            'source': '',
            'cursor': 0,
            'filename': ''
        };

        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return result;
        }

        let position = editor.getCursorBufferPosition();
        let row = position.row;
        let column = position.column;
        let text = editor.getText();

        // iterate through text, incrementing rows when newlines are found, and counting columsn when row is right
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
        result.filename = atom.workspace.getActiveTextEditor().getPath()
        return result;
    }

    async COMMAND_TYPE_INVALID(data) {
    }

    async COMMAND_TYPE_NAVIGATION(data) {
        let multiplier = (data.page) ? 25 : 1;
        let amount = multiplier;
        if (data.quantifier) {
            amount = data.quantifier * multiplier;
        }

        let keycodes = [];
        for (let i = 0; i < amount; i++) {
            keycodes.push(data.direction);
        }

        Applescript.keycodes(keycodes);
    }

    async COMMAND_TYPE_NEXT(data) {
        this._dispatch('find-and-replace:find-next');
    }

    async COMMAND_TYPE_NEXT_TAB(data) {
        atom.workspace.getActivePane().activateNextItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_OPEN_FILE(data) {
        this._dispatch('fuzzy-finder:toggle-file-finder');

        if (data.path) {
            Applescript.type(data.path);
        }
    }

    async COMMAND_TYPE_PASTE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        let text = atom.clipboard.read();
        let source = editor.getText();
        let cursor = data.cursor;
        if (!cursor) {
            cursor = 0;
        }

        // paste on a new line if a direction is specified or we're pasting a full line
        if (text.endsWith('\n') || data.direction) {
            if (!text.endsWith('\n')) {
                text += '\n';
            }

            // for below (the default), move the cursor to the start of the next line
            if (!data.direction || data.direction == 'below') {
                for (; cursor < source.length; cursor++) {
                    if (source[cursor] == "\n") {
                        cursor++;
                        break;
                    }
                }
            }

            // for paste above, go to the start of the current line
            else {
                // if we're at the end of a line, then move the cursor back one, or else we'll paste below
                if (source[cursor] == "\n" && cursor > 0) {
                    cursor--;
                }

                for (; cursor >= 0; cursor--) {
                    if (source[cursor] == "\n") {
                        cursor++;
                        break;
                    }
                }
            }
        }

        editor.setText(source.substring(0, cursor) + text + source.substring(cursor));
        this._moveCursor(data);
    }

    async COMMAND_TYPE_PREVIOUS(data) {
        this._dispatch('find-and-replace:find-previous');
    }

    async COMMAND_TYPE_PREVIOUS_TAB(data) {
        atom.workspace.getActivePane().activatePreviousItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_REDO(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.redo();
    }

    async COMMAND_TYPE_SAVE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        if (editor.getPath()) {
            editor.save();
        }
        else {
            let path = atom.applicationDelegate.showSaveDialog();
            if (path) {
                editor.saveAs(path);
            }
        }
    }

    async COMMAND_TYPE_SEARCH(data) {
        this._dispatch('find-and-replace:show');
        Applescript.type(data.text);
    }

    async COMMAND_TYPE_SET_EDITOR_STATUS(data) {
        let text = data.text;
        if (data.volume) {
            text += ' (' + Math.floor(data.volume * 100) + '%)';
        }

        this.delegate.updateStatus(text);
    }

    async COMMAND_TYPE_SPLIT(data) {
        this._dispatch('pane:split-' + data.direction + '-and-copy-active-item');
        await this._uiDelay();
    }

    async COMMAND_TYPE_SWITCH_TAB(data) {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
        await this._uiDelay();
    }

    async COMMAND_TYPE_UNDO(data) {
        atom.workspace.getActiveTextEditor().undo();
    }

    async COMMAND_TYPE_WINDOW(data) {
        let commands = {
            'left': 'on-left',
            'right': 'on-right',
            'up': 'above',
            'down': 'below'
        };

        this._dispatch('window:focus-pane-' + commands[data.direction]);
        await this._uiDelay();
    }
}
