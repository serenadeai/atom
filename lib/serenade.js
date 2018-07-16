'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesListView from './alternatives-list-view';
import HelpView from './help-view';
import IPC from './ipc';
import TranscriptInputView from './transcript-input-view';

class Serenade {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade-atom:initialize': () => this.initialize(),
            'serenade-atom:show-transcript-input': () => this.showTranscriptInput(),
            'serenade-atom:show-help': () => this.showHelp()
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

        this.alternativesListView = new AlternativesListView();
        this.helpView = new HelpView();
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

    showHelp() {
        this.helpView.show();
    }

    showTranscriptInput() {
        this.initialize();
        this.currentEditor = atom.workspace.getActiveTextEditor();
        this.transcriptInputView.show();
    }
}

export default new Serenade();
