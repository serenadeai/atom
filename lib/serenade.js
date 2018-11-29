'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesListView from './alternatives-list-view';
import Client from './client';
import IPC from './ipc';
import TranscriptInputView from './transcript-input-view';

class Serenade {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.initialize(),
            'serenade-atom:show-transcript-input': () => this.showTranscriptInput(),
        }));
    }

    consumeStatusBar(statusBar) {
        let status = document.createElement('span');
        this.statusView = statusBar.addLeftTile({item: status, priority: 1});
        this.updateStatus('Inactive');
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

        this.alternativesListView = new AlternativesListView();
        this.alternativesListView.delegate = this;

        this.transcriptInputView = new TranscriptInputView();
        this.transcriptInputView.delegate = this;

        this.statusView = null;

        this.ipc = new IPC(this);
        this.ipc.start();
    }

    hideAlternatives(animated) {
        this.alternativesListView.hide(animated);
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    sendText(text, chain) {
        if (chain === undefined) {
            chain = false;
        }

        this.ipc.send('SEND_TEXT', {
            text: text,
            chain: chain
        });
    }

    showAlternatives(choices) {
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.alternativesListView.show(choices);
    }

    showTranscriptInput() {
        this.initialize();
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.transcriptInputView.show();
    }

    updateStatus(status) {
        this.statusView.getItem().innerHTML = 'Serenade: ' + status;
    }
}

export default new Serenade();
