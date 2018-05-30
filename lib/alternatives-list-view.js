'use babel';

export default class AlternativesListView {
    constructor(serializedState) {
    }

    _getContainer(choices) {
        let container = document.createElement('div');
        let rows = choices.map((e, i) => {
            let svg = (i == 0) ? '<svg><circle r="15" cx="22" cy="22"></circle></svg>' : '';
            return `
<div class="choice">
    <div class="label">
        ${svg}
        <div class="num">${i + 1}</div>
    </div>
    <div class="choice_content">${e}</div>
</div>
            `;
        });

        container.innerHTML = `<div class="decide">${rows.join('')}</div>`;
        return container;
    }

    show(choices) {
        let editor = atom.workspace.getActiveTextEditor();
        let position = editor.getCursorBufferPosition();
        let marker = editor.markBufferPosition(position, {invalidate: 'never'});
        editor.decorateMarker(marker, {
            type: 'overlay',
            item: this._getContainer(choices)
        });

        setTimeout(() => {
            marker.destroy();
        }, 8300);
    }
}
