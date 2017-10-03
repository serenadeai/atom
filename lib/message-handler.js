'use babel';

import Applescript from './applescript';

export default class MessageHandler {
    static _dispatch(command) {
        atom.commands.dispatch(atom.views.getView(atom.workspace.getActiveTextEditor()), command);
    }

    static closeTab(data) {
        atom.workspace.getActivePane().destroyActiveItem();
    }

    static closeWindow(data) {
        MessageHandler._dispatch('pane:close');
    }

    static copy(data) {
        atom.clipboard.write(data.text);
    }

    static createTab(data) {
        atom.workspace.open();
    }

    static diff(data) {
        atom.workspace.getActiveTextEditor().setText(data.source);
        MessageHandler.moveCursor(data);
    }

    static moveCursor(data) {
        let editor = atom.workspace.getActiveTextEditor();
        let text = editor.getText();

        // iterate until the given substring index, incrementing rows and columns as we go
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

    static navigation(data) {
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

    static nextSearchResult(data) {
        MessageHandler._dispatch('find-and-replace:find-next');
    }

    static nextTab(data) {
        atom.workspace.getActivePane().activateNextItem();
    }

    static open(data) {
        MessageHandler._dispatch('fuzzy-finder:toggle-file-finder');
        Applescript.type(data.path);
    }

    static paste(data) {
        let text = atom.clipboard.read();
        let source = atom.workspace.getActiveTextEditor().getText();
        atom.workspace.getActiveTextEditor().setText(
            source.substring(0, data.cursor) + text + source.substring(data.cursor)
        );
    }

    static previousSearchResult(data) {
        MessageHandler._dispatch('find-and-replace:find-previous');
    }

    static previousTab(data) {
        atom.workspace.getActivePane().activatePreviousItem();
    }

    static redo(data) {
        atom.workspace.getActiveTextEditor().redo();
    }

    static save(data) {
        atom.workspace.getActiveTextEditor().save();
    }

    static search(data) {
        atom.commands.dispatch(atom.views.getView(atom.workspace.getActiveTextEditor()), 'find-and-replace:show');
        Applescript.type(data.query);
    }

    static split(data) {
        MessageHandler._dispatch('pane:split-' + data.direction + '-and-copy-active-item');
    }

    static switchTab(data) {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
    }

    static sourceAndCursor(data) {
        let editor = atom.workspace.getActiveTextEditor();
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

        return {
            source: text,
            cursor: cursor
        };
    }

    static undo(data) {
        atom.workspace.getActiveTextEditor().undo();
    }

    static window(data) {
        let commands = {
            'left': 'on-left',
            'right': 'on-right',
            'up': 'above',
            'down': 'below'
        };

        MessageHandler._dispatch('window:focus-pane-' + commands[data.direction]);
    }
}
