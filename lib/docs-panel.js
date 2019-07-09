'use babel';

export default class DocsPanel {
    constructor(state) {
        this.state = state;

        this._createPanel();
        this.state.subscribe('docs', (url) => {
            if (url) {
                this._container.querySelector('iframe').setAttribute('src', url);
                this._panel.show();
            }
            else {
                this._panel.hide();
            }
        });
    }

    _createPanel() {
        this._container = document.createElement('div');
        this._container.innerHTML = `
<div class="docs-panel">
  <iframe src="https://docs.serenade.ai" frameBorder="0"></iframe>
  <button class="btn btn-close">&times;</button>
</div>
        `;
        this._container.querySelector('.btn-close').addEventListener('click', (e) => {
            this.state.set('docs', false);
        });

        this._panel = atom.workspace.addRightPanel({
            item: this._container,
            visible: false
        });
    }
}
