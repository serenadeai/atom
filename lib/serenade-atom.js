'use babel';

import { CompositeDisposable } from 'atom';
import WebSocket from 'ws';
import MessageHandler from './MessageHandler';
import Alert from './Alert';

let log = (e) => {
    console.log(e);
};

export default {
    _retryTimeout: 1,
    alert: null,
    server: null,
    socket: null,
    subscriptions: null,

    activate(state) {
        this.alert = new Alert();
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

        // message received from serenade IPC server
        this.socket.on('message', (data) => {
            let value = JSON.parse(data);
            this.handleMessage(value.message, value.id, value.data);
        });

        // when socket is opened, send connect message to IPC to establish presence
        this.socket.on('open', () => {
            this.sendMessage('connect', '', {});
            this._retryTimeout = 1;
            log('connected');
        });

        // if connection is closed, then retry
        this.socket.on('close', (e) => {
            this.retry();
        });

        // handle connection errors gracefully
        this.socket.on('error', (e) => {
        });
    },

    disconnect() {
        if (this.socket) {
            this.socket.terminate();
            this.socket = null;
        }
    },

    handleMessage(message, id, data) {
        // call the static method on the message handler of the same name
        let o = MessageHandler.prototype.constructor;
        if (!(message in o)) {
            return;
        }

        this.sendMessage(message, id, o[message](data));
    },

    retry() {
        // use an exponential backoff
        log(['Retrying connection', this._retryTimeout]);
        this.socket.terminate();
        this._retryTimeout *= 2;

        // if we're out of retries, then show error banner and stop
        if (this._retryTimeout > 8) {
            this._retryTimeout = 1;
            this.showConnectionError();
            return;
        }

        setTimeout(() => {
            this.connect();
        }, this._retryTimeout * 20);
    },

    sendMessage(message, id, data) {
        // send message to IPC server over the socket
        this.socket.send(JSON.stringify({
            message: message,
            id: id,
            data: data
        }));
    },

    showConnectionError() {
        // show alert message that retries a connection on click
        this.alert.hide();
        this.alert.setMessage('Serenade app not running. Restart the app and then ', 'try again.', (e) => {
            this.alert.hide();
            this.connect();
        });
        this.alert.show();
    }
};
