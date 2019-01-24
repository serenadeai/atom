'use babel';

import http from 'http';

export default class IPC {
    constructor(delegate, commandHandler) {
        this.delegate = delegate;
        this.commandHandler = commandHandler;
        this.server = null;
    }

    _internal(alternative) {
        let internal = [
            'COMMAND_TYPE_GET_EDITOR_STATE',
            'COMMAND_TYPE_SET_EDITOR_STATUS',
            'COMMAND_TYPE_CANCEL',
            'COMMAND_TYPE_USE'
        ];

        for (let sequence of alternative.sequences) {
            for (let command of sequence.commands) {
                if (internal.includes(command.type)) {
                    return true;
                }
            }
        }

        return false;
    }

    async handle(parseResponse) {
        this.delegate.setCurrentEditor();
        if (parseResponse.alternatives) {
            this.delegate.alternativesPanel.showAlternatives(parseResponse.alternatives);
        }

        let result = null;
        if (parseResponse.execute) {
            for (let i = 0; i < parseResponse.execute.sequences.length; i++) {
                let sequence = parseResponse.execute.sequences[i];

                for (let command of sequence.commands) {
                    result = await this.commandHandler[command.type](command);
                }
            }
        }

        this.delegate.focusEditor();
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

        this.server.listen(17374);
    }

    stop() {
        this.server.close();
    }
}
