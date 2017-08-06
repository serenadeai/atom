'use babel';

import { CompositeDisposable } from 'atom';
import WebSocket from 'ws';

let log = (e) => {
    console.log(e);
};

class MessageHandler {
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

export default {
    _retryTimeout: 1,
    server: null,
    socket: null,
    subscriptions: null,

    activate(state) {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.connect()
        }));
    },

    deactivate() {
        this.subscriptions.dispose();
        this.disconnect();
    },

    connect() {
        this.disconnect();
        this.socket = new WebSocket('ws://localhost:17373/atom');

        this.socket.on('message', (data) => {
            let value = JSON.parse(data);
            this.handleMessage(value.message, value.id, value.data);
        });

        this.socket.on('open', () => {
            this.sendMessage('connect', '', {});
            this._retryTimeout = 1;
            log('connected');
        });

        this.socket.on('error', (e) => {
            this.retry();
        });
    },

    disconnect() {
        if (this.socket) {
            this.socket.terminate();
            this.socket = null;
        }
    },

    handleMessage(message, id, data) {
        let o = MessageHandler.prototype.constructor;
        if (!(message in o)) {
            return;
        }

        this.sendMessage(message, id, o[message](data));
    },

    retry() {
        log(['Retrying connection', this._retryTimeout]);
        this.socket.terminate();
        this._retryTimeout *= 2;

        if (this._retryTimeout > 8) {
            log('Ending retry');
            return;
        }

        setTimeout(() => {
            this.connect();
        }, this._retryTimeout * 1000);
    },

    sendMessage(message, id, data) {
        this.socket.send(JSON.stringify({
            message: message,
            id: id,
            data: data
        }));
    }
};
