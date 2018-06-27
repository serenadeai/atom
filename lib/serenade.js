'use babel';

import { CompositeDisposable } from 'atom';
import AlertView from './alert-view';
import TranscriptInputView from './transcript-input-view';
import AlternativesListView from './alternatives-list-view';
import IPC from './ipc';

class Serenade {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.initialize(),
            'serenade-atom:show-transcript-input': () => this.showTranscriptInput()
        }));
    }

    consumeStatusBar(statusBar) {
        let status = document.createElement('span');
        status.innerHTML = 'Inactive';

        this.statusView = statusBar.addLeftTile({item: status, priority: 1});
    }

    deactivate() {
        this.subscriptions.dispose();
        this.ipc.stop();
        this.statusView.destroy();
        this.statusView = null;
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.alertView = new AlertView();
        this.alternativesListView = new AlternativesListView();
        this.transcriptInputView = new TranscriptInputView();
        this.transcriptInputView.delegate = this;
        this.statusView = null;

        this.ipc = new IPC(this);
        this.ipc.start();
    }

    hideAlternatives(data) {
        this.alternativesListView.hide();
    }

    onStatusUpdate(status) {
        this.statusView.getItem().innerHTML = status;
    }

    onTranscriptInputDone(text) {
        this.ipc.send('SEND_COMMAND_TO_SERVER', {
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
