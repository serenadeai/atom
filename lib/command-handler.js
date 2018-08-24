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

    _uiDelay(callback) {
        // wait enough time for UI updates to actually happen
        setTimeout(() => {
            callback()
        }, 300);
    }

    COMMAND_TYPE_CLOSE_TAB(data, callback) {
        atom.workspace.getActivePane().destroyActiveItem();
        this._uiDelay(callback);
    }

    COMMAND_TYPE_CLOSE_WINDOW(data, callback) {
        this._dispatch('pane:close');
        this._uiDelay(callback);
    }

    COMMAND_TYPE_COPY(data, callback) {
        atom.clipboard.write(data.text);
        callback();
    }

    COMMAND_TYPE_CREATE_TAB(data, callback) {
        atom.workspace.open();
        this._uiDelay(callback);
    }

    COMMAND_TYPE_DIFF(data, callback) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        atom.workspace.getActiveTextEditor().setText(data.source);
        this._moveCursor(data);
        callback();
    }

    COMMAND_TYPE_HIDE_ALTERNATIVES(data, callback) {
        this.delegate.hideAlternatives();
        callback();
    }

    COMMAND_TYPE_NAVIGATION(data, callback) {
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
        callback();
    }

    COMMAND_TYPE_NEXT(data, callback) {
        this._dispatch('find-and-replace:find-next');
        callback();
    }

    COMMAND_TYPE_NEXT_TAB(data, callback) {
        atom.workspace.getActivePane().activateNextItem();
        this._uiDelay(callback);
    }

    COMMAND_TYPE_OPEN_FILE(data, callback) {
        this._dispatch('fuzzy-finder:toggle-file-finder');

        if (data.path) {
            Applescript.type(data.path);
        }

        callback();
    }

    COMMAND_TYPE_PASTE(data, callback) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            callback();
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
                for (; cursor >= 0; cursor--) {
                    if (source[cursor] == "\n") {
                        cursor++;
                        break;
                    }
                }
            }
        }

        // if we're at the last line, we need another newline first
        if (cursor >= source.length - 1) {
            text = "\n" + text;
        }

        editor.setText(source.substring(0, cursor) + text + source.substring(cursor));
        this._moveCursor(data);
        callback();
    }

    COMMAND_TYPE_PREVIOUS(data, callback) {
        this._dispatch('find-and-replace:find-previous');
        callback();
    }

    COMMAND_TYPE_PREVIOUS_TAB(data, callback) {
        atom.workspace.getActivePane().activatePreviousItem();
        this._uiDelay(callback);
    }

    COMMAND_TYPE_REDO(data, callback) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            callback();
            return;
        }

        editor.redo();
        callback();
    }

    COMMAND_TYPE_SAVE(data, callback) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            callback();
            return;
        }

        if (editor.getPath()) {
            editor.save();
        }
        else {
            let path = atom.applicationDelegate.showSaveDialog();
            editor.saveAs(path);
        }

        callback();
    }

    COMMAND_TYPE_SEARCH(data, callback) {
        this._dispatch('find-and-replace:show');
        Applescript.type(data.text);
        callback();
    }

    COMMAND_TYPE_SHOW_ALTERNATIVES(data, callback) {
        let alternatives = [];
        for (let alternative of data.alternatives) {
            alternatives.push(JSON.parse(alternative));
        }

        this.delegate.showAlternatives(alternatives);
        callback();
    }

    COMMAND_TYPE_SOURCE_AND_CURSOR(data, callback) {
        let result = {
            'source': '',
            'cursor': 0,
            'filename': ''
        };

        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            callback(result);
        };

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
        callback(result);
    }

    COMMAND_TYPE_SPLIT(data, callback) {
        this._dispatch('pane:split-' + data.direction + '-and-copy-active-item');
        this._uiDelay(callback);
    }

    COMMAND_TYPE_STATUS(data, callback) {
        this.delegate.onStatusUpdate(data.status);
        callback();
    }

    COMMAND_TYPE_SWITCH_TAB(data, callback) {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
        this._uiDelay(callback);
    }

    COMMAND_TYPE_UNDO(data, callback) {
        atom.workspace.getActiveTextEditor().undo();
        callback();
    }

    COMMAND_TYPE_WINDOW(data, callback) {
        let commands = {
            'left': 'on-left',
            'right': 'on-right',
            'up': 'above',
            'down': 'below'
        };

        this._dispatch('window:focus-pane-' + commands[data.direction]);
        this._uiDelay(callback);
    }
}
