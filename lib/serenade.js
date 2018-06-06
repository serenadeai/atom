'use babel';

import { CompositeDisposable } from 'atom';
import CommandHandler from './command-handler';
import AlertView from './alert-view';
import TranscriptInputView from './transcript-input-view';
import AlternativesListView from './alternatives-list-view';
import IPC from './ipc';

class Serenade {
    activate(state) {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.initialize(),
            'serenade-atom:show-transcript-input': () => this.showTranscriptInput()
        }));
    }

    deactivate() {
        this.subscriptions.dispose();
        this.ipc.disconnect();
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.alertView = new AlertView();
        this.alternativesListView = new AlternativesListView();
        this.transcriptInputView = new TranscriptInputView();
        this.transcriptInputView.delegate = this;

        this.commandHandler = new CommandHandler(this);
        this.ipc = new IPC(this);
        this.ipc.connect();
    }

    hideAlternatives(data) {
        this.alternativesListView.hide();
    }

    onIPCCommand(command) {
        // call the method on the command handler of the same name
        if (!(command.type in this.commandHandler)) {
            return;
        }

        this.ipc.send('CALLBACK', command.id, this.commandHandler[command.type](command.data));
    }

    onIPCConnectionSucceeded() {
        this.alertView.hide();
    }

    onIPCConnectionFailed() {
        // show alert message that retries a connection on click
        this.alertView.setMessage('Serenade app not running. Restart the app and then ', 'try again.', (e) => {
            this.alertView.hide();
            this.ipc.connect();
        });

        this.alertView.show();
    }

    onTranscriptInputDone(text) {
        this.ipc.send('SEND_COMMAND_TO_SERVER', Math.random().toString(), {
            text: text
        });
    }

    onTranscriptInputHide() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    showAlternatives(data) {
        this.alternativesListView.show(data);
    }

    showTranscriptInput() {
        this.initialize();
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.transcriptInputView.show();
    }
}

export default new Serenade();
