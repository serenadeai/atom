import App from './app';
import IPC from './shared/ipc';

export default class TranscriptInputView {
    private app: App;
    private ipc: IPC;
    private container: HTMLElement;
    private input: any;
    private panel: any;

    constructor(app: App, ipc: IPC) {
        this.app = app;
        this.ipc = ipc;

        // create container
        this.container = document.createElement('div');
        this.container.classList.add('serenade');
        this.container.classList.add('transcript-input-container');

        // create element to hold input view
        this.input = document.createElement('atom-text-editor');
        this.input.setAttribute('mini', 'true');
        this.input.addEventListener('blur', () => {
            this.hide();
        });

        this.input.addEventListener('keyup', (e: any) => {
            // hide on escape key
            if (e.which == 27) {
                this.hide();
            }

            // execute command on enter key
            else if (e.which == 13) {
                this.execute();
                this.hide();
            }
        });

        this.container.appendChild(this.input);

        // create native atom panel at top of editor
        this.panel = atom.workspace.addModalPanel({item: this.container, visible: false});
    }

    execute() {
        this.ipc.send('SEND_TEXT', {text: this.input!.getModel().getText()});
    }

    hide() {
        this.panel.hide();
        this.app.focusEditor();
    }

    show() {
        this.input.getModel().setText('');
        this.panel.show();
        this.input.focus();
    }
}
