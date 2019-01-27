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

        this.listening = false;
        this.settings = new Settings();
        this.client = new Client(this, this.settings);

        this.commandHandler = new CommandHandler(this, this.settings);
        this.ipc = new IPC(this, this.commandHandler);
        this.alternativesPanel = new AlternativesPanel(this, this.ipc, this.settings);
        this.commandHandler.alternativesPanel = this.alternativesPanel;
        this.transcriptInputView = new TranscriptInputView(this, this.ipc);

        this.ipc.start();
        this.client.autorun(() => {
            this.alternativesPanel.showSuggestions();
        });
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    restart() {
        this.client.kill();
        this.client.run();
    }

    showTranscriptInput() {
        this.initialize();
        this.setCurrentEditor();
        this.transcriptInputView.show();
    }

    setCurrentEditor() {
        this.currentEditor = atom.workspace.getActiveTextEditor();
    }
}

export default new Serenade();
