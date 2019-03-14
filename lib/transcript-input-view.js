'use babel'

export default class TranscriptInputView {
    constructor(delegate, ipc) {
        this.delegate = delegate;
        this.ipc = ipc;

        // create container
        this.element = document.createElement('div');
        this.element.classList.add('serenade');
        this.element.classList.add('transcript-input-container');

        // create element to hold input view
        this.input = document.createElement('atom-text-editor');
        this.input.setAttribute('mini', 'true');
        this.input.addEventListener('blur', (e) => {
            this.hide();
        });

        this.input.addEventListener('keyup', (e) => {
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

        this.element.appendChild(this.input);

        // create native atom panel at top of editor
        this.panel = atom.workspace.addModalPanel({
            item: this.element,
            visible: false
        });
    }

    execute() {
        this.ipc.sendText(this.input.getModel().getText());
    }

    hide() {
        this.panel.hide();
        if (this.delegate) {
            this.delegate.focusEditor();
        }
    }

    show() {
        this.input.getModel().setText('');
        this.panel.show();
        this.input.focus();
    }
}
