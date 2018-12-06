'use babel';

import http from 'http';
import CommandHandler from './command-handler';

export default class IPC {
    constructor(delegate) {
        this.delegate = delegate;
        this.server = null;
        this.commandHandler = new CommandHandler(delegate);
    }

    _continueChain(command) {
        // for now, assume that any non-diff command breaks the chain
        return command.type == 'COMMAND_TYPE_DIFF';
    }

    _internal(alternative) {
        let internal = [
            'COMMAND_TYPE_GET_EDITOR_STATE',
            'COMMAND_TYPE_SET_EDITOR_STATUS'
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
        // if there's just one alternative, then execute all commands in the sequences
        let chain = true;
        let result = null;
        if (parseResponse.execute) {
            if (!this._internal(parseResponse.execute)) {
                this.delegate.highlightAlternative(parseResponse.useIndex || 0);
            }

            for (let i = 0; i < parseResponse.execute.sequences.length; i++) {
                let sequence = parseResponse.execute.sequences[i];

                // if the chain has been broken, then send the remaining transcripts back to the server to run
                // with the updated editor state
                if (!chain) {
                    let remaining = parseResponse.execute.sequences.slice(i).map((e) => e.transcript).join(' ');
                    this.delegate.sendText(remaining, true);
                    return result;
                }

                for (let command of sequence.commands) {
                    result = await this.commandHandler[command.type](command);
                    if (!this._continueChain(command)) {
                        chain = false;
                    }
                }
            }

            return result;
        }

        // if there are multiple elements, then show the alternatives view
        else {
            this.delegate.showAlternatives(parseResponse.alternatives);
        }
    }

    send(type, data) {
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
