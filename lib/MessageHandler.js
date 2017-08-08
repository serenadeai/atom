'use babel';

export default class MessageHandler {
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
        let amount = (data.page) ? 25 : 1;
        let functions = {
            'up': 'moveUp',
            'down': 'moveDown',
            'left': 'moveLeft',
            'right': 'moveRight'
        };
        if (!functions[data.direction]) {
            return;
        }

        atom.workspace.getActiveTextEditor()[functions[data.direction]](amount);
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
}
