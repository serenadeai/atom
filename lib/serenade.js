'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesPanel from './alternatives-panel';
import Client from './client';
import CommandHandler from './command-handler';
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
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.settings = new Settings();
        this.client = new Client(this.settings);
        this.client.autorun();

        this.commandHandler = new CommandHandler(this);
        this.ipc = new IPC(this, this.commandHandler);
        this.alternativesPanel = new AlternativesPanel(this.ipc, this.settings);
        this.transcriptInputView = new TranscriptInputView(this, this.ipc);
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
