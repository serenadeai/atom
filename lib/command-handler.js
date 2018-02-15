'use babel';

import Applescript from './applescript';

export default class CommandHandler {
    static _dispatch(command) {
        let view = atom.workspace.getActivePane();
        let editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            view = atom.views.getView(editor);
        }

        atom.commands.dispatch(view, command);
    }

    static _moveCursor(data) {
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

    static CLOSE_TAB(data) {
        atom.workspace.getActivePane().destroyActiveItem();
    }

    static CLOSE_WINDOW(data) {
        CommandHandler._dispatch('pane:close');
    }

    static COPY(data) {
        atom.clipboard.write(data.text);
    }

    static CREATE_TAB(data) {
        atom.workspace.open();
    }

    static DIFF(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        atom.workspace.getActiveTextEditor().setText(data.source);
        CommandHandler._moveCursor(data);
    }

    static NAVIGATION(data) {
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

    static NEXT(data) {
        CommandHandler._dispatch('find-and-replace:find-next');
    }

    static NEXT_TAB(data) {
        atom.workspace.getActivePane().activateNextItem();
    }

    static OPEN_FILE(data) {
        CommandHandler._dispatch('fuzzy-finder:toggle-file-finder');

        if (data.path) {
            Applescript.type(data.path);
        }
    }

    static PASTE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        let text = atom.clipboard.read();
        let source = editor.getText();
        editor.setText(source.substring(0, data.cursor) + text + source.substring(data.cursor));
        CommandHandler._moveCursor(data);
    }

    static PREVIOUS(data) {
        CommandHandler._dispatch('find-and-replace:find-previous');
    }

    static PREVIOUS_TAB(data) {
        atom.workspace.getActivePane().activatePreviousItem();
    }

    static REDO(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.redo();
    }

    static SAVE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.save();
    }

    static SEARCH(data) {
        CommandHandler._dispatch('find-and-replace:show');
        Applescript.type(data.text);
    }

    static SOURCE_AND_CURSOR(data) {
        let result = {
            'source': '',
            'cursor': 0
        };

        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return result;
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
        return result;
    }

    static SPLIT(data) {
        CommandHandler._dispatch('pane:split-' + data.direction + '-and-copy-active-item');
    }

    static SWITCH_TAB(data) {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
    }

    static UNDO(data) {
        atom.workspace.getActiveTextEditor().undo();
    }

    static WINDOW(data) {
        let commands = {
            'left': 'on-left',
            'right': 'on-right',
            'up': 'above',
            'down': 'below'
        };

        CommandHandler._dispatch('window:focus-pane-' + commands[data.direction]);
    }
}
