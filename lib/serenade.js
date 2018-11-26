'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesListView from './alternatives-list-view';
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
        this.onStatusUpdate('Inactive');
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
        this.transcriptInputView = new TranscriptInputView();
        this.transcriptInputView.delegate = this;
        this.statusView = null;

        this.ipc = new IPC(this);
        this.ipc.start();

        // setTimeout(() => {
        //     this.alternativesListView.show([{
        //         'sequences': [{
        //             'commands': [{
        //                 'type': 'COMMAND_TYPE_DIFF'
        //             }],
        //             'code': "class ThisIsAClass(WithSomeParent):\n    my_field_name = some.model.CharField(max_length=20)",
        //             'description': 'add class',
        //             'transcript': 'add class'
        //         }]
        //     }, {
        //         'sequences': [{
        //             'commands': [{
        //                 'type': 'COMMAND_TYPE_DIFF'
        //             }],
        //             'description': 'line 2',
        //             'transcript': 'line 2'
        //         }]
        //     }]);
        // }, 1000);
    }

    hideAlternatives(animated) {
        this.alternativesListView.hide(animated);
    }

    onStatusUpdate(status) {
        this.statusView.getItem().innerHTML = 'Serenade: ' + status;
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
