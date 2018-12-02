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

    async handle(ipcCommand) {
        // if there's just one element, then execute all commands in the sequences
        let chain = true;
        let result = null;
        let hidden = false;
        if (ipcCommand.elements.length == 1) {
            for (let i = 0; i < ipcCommand.elements[0].sequences.length; i++) {
                let sequence = ipcCommand.elements[0].sequences[i];

                // if the chain has been broken, then send the remaining transcripts back to the server to run
                // with the updated editor state
                if (!chain) {
                    let remaining = ipcCommand.elements[0].sequences.slice(i).map((e) => e.transcript).join(' ');
                    this.delegate.sendText(remaining, true);
                    return result;
                }

                for (let command of sequence.commands) {
                    if (!hidden && command.type != 'COMMAND_TYPE_GET_EDITOR_STATE') {
                        this.delegate.hideAlternatives(true);
                        hidden = true;
                    }

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
            this.delegate.hideAlternatives(false);
            this.delegate.showAlternatives(ipcCommand.elements);
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
                let result = {success: true};
                let ipcCommands = JSON.parse(body);
                if (ipcCommands.elements !== undefined) {
                    result = await this.handle(ipcCommands);
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
