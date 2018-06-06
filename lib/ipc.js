'use babel';

import WebSocket from 'ws';

export default class IPC {
    constructor(delegate) {
        this.delegate = delegate;
        this.retryTimeout = 1;
        this.socket = null;
    }

    connect() {
        this.disconnect();
        this.socket = new WebSocket('ws://localhost:17373/');

        // message received from serenade IPC server
        this.socket.on('message', (data) => {
            this.delegate.onIPCCommand(JSON.parse(data));
        });

        // if connection is closed, then retry
        this.socket.on('close', (e) => {
            this.retry();
        });

        this.socket.on('error', (e) => {
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.terminate();
            this.socket = null;
        }
    }

    retry() {
        // use an exponential backoff
        this.retryTimeout *= 2;

        // if we're out of retries, then show error banner and stop
        if (this.retryTimeout > 8) {
            this.retryTimeout = 1;
            this.delegate.onIPCConnectionFailed();
            return;
        }

        setTimeout(() => {
            this.connect();
        }, this.retryTimeout * 1000);
    }

    send(type, id, data) {
        this.socket.send(JSON.stringify({
            type: type,
            id: id,
            data: data
        }));
    }
}
