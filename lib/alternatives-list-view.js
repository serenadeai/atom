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
            if (e.commands.length == 1 && e.commands[0].type == 'COMMAND_TYPE_INVALID') {
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
        let editor = atom.workspace.getActiveTextEditor();
        let position = editor.getCursorBufferPosition();
        this.marker = editor.markBufferPosition(position, {invalidate: 'never'});
        editor.decorateMarker(this.marker, {
            type: 'overlay',
            item: this._createContainer(choices)
        });
    }
}
