'use babel';

export default class MessageHandler {
    static diff(data) {
        atom.workspace.getActiveTextEditor().setText(data.source);
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

        var cursor = 0;
        var currentRow = 0;
        var currentColumn = 0;
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
