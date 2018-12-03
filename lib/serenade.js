'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesPanel from './alternatives-panel';
import Client from './client';
import IPC from './ipc';
import Settings from './settings';
import TranscriptInputView from './transcript-input-view';

class Serenade {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.initialize(),
            'serenade-atom:show-transcript-input': () => this.showTranscriptInput(),
            'serenade-atom:restart': () => this.restart(),
        }));
    }

    deactivate() {
        this.client.kill();

        this.subscriptions.dispose();
        this.ipc.stop();
        this.statusView.destroy();
        this.statusView = null;
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.settings = new Settings();
        this.client = new Client(this.settings);
        this.client.autorun();

        this.alternativesPanel = new AlternativesPanel();
        this.alternativesPanel.delegate = this;

        this.transcriptInputView = new TranscriptInputView();
        this.transcriptInputView.delegate = this;

        this.statusView = null;

        this.ipc = new IPC(this);
        this.ipc.start();
    }

    clearAlternatives() {
        this.alternativesPanel.clear();
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    highlightAlternative(index) {
        this.alternativesPanel.highlight(index);
    }

    restart() {
        this.client.kill();
        this.client.run();
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

    showAlternatives(alternatives) {
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.alternativesPanel.show(alternatives);
    }

    showTranscriptInput() {
        this.initialize();
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.transcriptInputView.show();
    }

    updateStatus(status) {
        this.alternativesPanel.updateStatus(status);
    }
}

export default new Serenade();
