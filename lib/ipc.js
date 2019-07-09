'use babel';

import http from 'http';

export default class IPC {
    constructor(delegate, state, commandHandler) {
        this.delegate = delegate;
        this.state = state;
        this.commandHandler = commandHandler;
        this.server = null;
    }

    async handle(parseResponse) {
        this.delegate.setCurrentEditor();
        if (parseResponse.alternatives) {
            this.state.set('alternatives', { alternatives: parseResponse.alternatives });
        }

        let result = null;
        if (parseResponse.execute) {
            this.state.set('volume', 0);
            for (let i = 0; i < parseResponse.execute.sequences.length; i++) {
                let sequence = parseResponse.execute.sequences[i];

                for (let command of sequence.commands) {
                    result = await this.commandHandler[command.type](command);
                }
            }
        }

        return result;
    }

    send(type, data) {
        if (!data) {
            data = {};
        }

        data.type = type;
        let json = JSON.stringify(data);

        let request = http.request({
            host: 'localhost',
            port: 17373,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(json)
            }
        });

        request.write(json);
        request.end();
    }

    sendText(text, chain) {
        if (chain === undefined) {
            chain = false;
        }

        this.send('SEND_TEXT', {
            text: text,
            chain: chain
        });
    }

    start() {
        this.state.subscribe('listening', (listening) => {
            this.send(listening ? 'ENABLE_LISTENING' : 'DISABLE_LISTENING');
        });

        this.server = http.createServer((request, response) => {
            let body = '';
            request.on('data', (data) => {
                body += data;
            });

            request.on('end', async () => {
                let parseResponse = JSON.parse(body);
                let result = await this.handle(parseResponse);
                if (!result) {
                    result = {success: true};
                }

                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify(result));
            });
        });

        this.server.once('error', function(error) {
            if (error.code === 'EADDRINUSE') {
                atom.notifications.addError('Serenade is already running in another editor window.', {
                    'description': 'Serenade only supports running in one window at a time for now. Close this window to use Serenade.',
                    'dismissable': false
                });

                return;
            }
        });

        this.server.listen(17374);
    }

    stop() {
        this.server.close();
    }
}
