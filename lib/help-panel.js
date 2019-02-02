'use babel';

export default class HelpPanel {
    constructor(state) {
        this.state = state;
        this._createPanel();

        this.state.subscribe('help', (visible) => {
            if (visible) {
                this._panel.show();
            }
            else {
                this._panel.hide();
            }
        });
    }

    _createPanel() {
        this._container = document.createElement('iframe');
        this._container.setAttribute('src', 'https://docs.serenade.ai/docs/reference.html');
        this._container.setAttribute('frameBorder', '0');

        this._panel = atom.workspace.addRightPanel({
            item: this._container,
            visible: false
        });
    }
}
