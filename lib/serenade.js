'use babel';

import { CompositeDisposable } from 'atom';
import AlternativesPanel from './alternatives-panel';
import ClientRunner from './client-runner/client-runner';
import CommandHandler from './command-handler';
import HelpPanel from './help-panel';
import IPC from './ipc';
import Settings from './settings';
import StateManager from './state-manager';
import TranscriptInputView from './transcript-input-view';

class Serenade {
    activate(state) {
        this.initialize();

        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'serenade:initialize': () => this.initialize(),
            'serenade:show-transcript-input': () => this.showTranscriptInput(),
            'serenade:restart': () => this.restart(),
            'serenade:toggle-help-panel': () => this.toggleHelpPanel(),
        }));
    }

    deactivate() {
        this.clientRunner.getRunner().kill();

        this.subscriptions.dispose();
        this.ipc.stop();
    }

    initialize() {
        if (this.ipc) {
            return;
        }

        this.state = new StateManager();
        this.state.set('status', 'Ready');

        this.settings = new Settings();
        this.clientRunner = new ClientRunner(this.state, this.settings);
        this.helpPanel = new HelpPanel(this.state);
        this.commandHandler = new CommandHandler(this, this.state, this.settings);
        this.ipc = new IPC(this, this.state, this.commandHandler);
        this.alternativesPanel = new AlternativesPanel(this.state, this.ipc, this.settings);
        this.transcriptInputView = new TranscriptInputView(this, this.ipc);

        this.state.set('alternatives', {});
        this.state.set('help', false);
        this.state.set('ready', 'initializing');
        this.state.set('volume', 0);

        this.ipc.start();
        this.clientRunner.getRunner().installAndRun(() => {
            let token = this.settings.get('token');
            this.state.set('status', 'Ready');
            this.state.set('ready', token && token.length ? 'ready' : 'token');
        });
    }

    focusEditor() {
        // refocus whatever was active previously, not sure why this doesn't happen automatically
        if (this.currentEditor) {
            atom.workspace.paneForItem(this.currentEditor).activate();
        }
    }

    restart() {
        this.clientRunner.getRunner().kill();
        this.clientRunner.getRunner().installAndRun();
    }

    showTranscriptInput() {
        this.initialize();
        this.setCurrentEditor();
        this.transcriptInputView.show();
    }

    setCurrentEditor() {
        this.currentEditor = atom.workspace.getActiveTextEditor();
    }

    toggleHelpPanel() {
        this.state.set('help', !this.state.get('help'));
    }
}

export default new Serenade();
