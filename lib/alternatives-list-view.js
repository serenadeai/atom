'use babel';

export default class AlternativesListView {
    constructor(serializedState) {
        this.marker = null;
    }

    _createContainer(choices) {
        this.container = document.createElement('div');

        // create a row for each choice
        let allInvalid = true;
        let rows = choices.map((e, i) => {
            // for invalid commands, show an X rather than a number
            let choiceClass = '';
            let number = `<div class="num">${i + 1}</div>`;
            if (
                e.sequences.length == 1 &&
                e.sequences[0].commands.length == 1 &&
                e.sequences[0].commands[0].type == 'COMMAND_TYPE_INVALID'
            ) {
                number = `<div class="num">&times;</div>`;
                choiceClass = 'invalid';
            }
            else {
                allInvalid = false;
            }

            let description = e.sequences.map((sequence) => {
                return ((sequence.description && sequence.description.trim()) || sequence.transcript);
            }).join(' ');

            let code = e.sequences.map((sequence) => {
                return (sequence.code)
                    ? `<div class="alternative-code"><pre>${this._escape(sequence.code)}</pre></div>`
                    : '';
            });

            return `
<div class="alternative-row ${choiceClass}">
    <div class="alternative-number">
        ${number}
    </div>
    <div class="alternative-description">${this._escape(description) || this._escape(e.transcript)}</div>
    ${code}
</div>`;
        });

        let headerText = (allInvalid) ? 'No valid commands.' : 'Did you mean:';
        this.container.innerHTML = `
<div class="alternatives zoom-in ${allInvalid ? 'invalid' : ''}">
    <div class="alternatives-header">
        <span>${headerText}</span>
    </div>
    ${rows.join('')}
</div>`;
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('alternatives-close')) {
                this.hide(true);
            }
        });

        return this.container;
    }

    _escape(s) {
        if (!s) {
            return s;
        }

        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hide(animated) {
        if (this.marker) {
            if (animated) {
                this.container.classList.add('zoom-out');
                setTimeout(() => {
                    this.hide(false);
                }, 200);
            }
            else {
                this.marker.destroy();
            }
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

        // check if any alternative is valid
        let shouldHide = true;
        for (let choice of choices) {
            if (!(
                choice.sequences.length == 1 &&
                choice.sequences[0].commands.length == 1 &&
                choice.sequences[0].commands[0].type == 'COMMAND_TYPE_INVALID'
            )) {
                shouldHide = false;
            }
        }

        // hide automatically if there aren't any valid options
        if (shouldHide) {
            setTimeout(() => {
                this.hide(true);
            }, 5000);
        }
    }
}
