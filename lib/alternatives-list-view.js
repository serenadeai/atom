'use babel';

export default class AlternativesListView {
    constructor(serializedState) {
        this.marker = null;
    }

    _createContainer(choices) {
        // create a row for each choice
        let container = document.createElement('div');
        let rows = choices.map((e, i) => {
            // show the animated border only on the first choice
            let circleBorder = (i == 0) ? '<svg><circle r="15" cx="22" cy="22"></circle></svg>' : '';

            // for invalid commands, show an X rather than a number
            let choiceClass = '';
            let number = `<div class="num">${i + 1}</div>`;
            if (e.sequence.commands.length == 1 && e.sequence.commands[0].type == 'COMMAND_TYPE_INVALID') {
                number = `<div class="num">&times;</div>`;
                choiceClass = 'invalid';
            }

            return `
<div class="choice ${choiceClass}">
    <div class="label">
        ${circleBorder}
        ${number}
    </div>
    <div class="choice_content">${e.transcript}</div>
</div>
            `;
        });

        container.innerHTML = `<div class="decide">${rows.join('')}</div>`;
        return container;
    }

    hide() {
        if (this.marker) {
            this.marker.destroy();
        }
    }

    show(choices) {
        this.hide();
        if (choices.length == 0) {
            return;
        }

        // get coordinates defining current screen
        let editor = atom.workspace.getActiveTextEditor();
        let editorView = atom.views.getView(editor);
        let position = editor.getCursorBufferPosition();
        let currentPixel = editorView.pixelPositionForScreenPosition(position).top;
        let top = editorView.getFirstVisibleScreenRow();
        let bottom = editorView.getLastVisibleScreenRow();

        // make sure the cursor is in the currently-visible screen
        if (position.row < top) {
            editorView.setScrollTop(editorView.pixelPositionForScreenPosition(position).top);
        }
        else if (position.row > bottom) {
            let bottomPixel = editorView.pixelPositionForScreenPosition({row: bottom, column: 0}).top;
            let currentPixel = editorView.pixelPositionForScreenPosition(position).top;
            editorView.setScrollTop(editorView.getScrollTop() + (currentPixel - bottomPixel));
        }

        // display alternatives list as marker
        this.marker = editor.markBufferPosition(position, {invalidate: 'never'});
        editor.decorateMarker(this.marker, {
            type: 'overlay',
            item: this._createContainer(choices)
        });
    }
}
