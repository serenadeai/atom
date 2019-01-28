'use babel';

export default class CommandHandler {
    constructor(delegate, state, settings) {
        this.delegate = delegate;
        this.state = state;
        this.settings = settings;
        this._pendingFiles = [];
        this._skipNextUse = false;
        this._ignorePatternsData = null;
    }

    _dispatch(command) {
        let view = atom.workspace.getActivePane();
        let editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            view = atom.views.getView(editor);
        }

        atom.commands.dispatch(view, command);
    }

    _ignorePatterns() {
        if (this._ignorePatternsData == null) {
            this._ignorePatternsData = {
                directory: [],
                file: []
            }

            for (let pattern of this.settings.ignore()) {
                if (pattern.endsWith('/')) {
                    this._ignorePatternsData.directory.push(new RegExp(pattern.replace(/\/+$/g, '')));
                }
                else {
                    this._ignorePatternsData.file.push(new RegExp(pattern));
                }
            }
        }

        return this._ignorePatternsData;
    }

    _moveCursor(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        // iterate until the given substring index, incrementing rows and columns as we go
        let text = editor.getText();
        let row = 0;
        let column = 0;
        for (let i = 0; i < data.cursor; i++) {
            column++;
            if (text[i] == "\n") {
                row++;
                column = 0;
            }
        }

        editor.setCursorBufferPosition([row, column]);
    }

    _openPendingFileAtIndex(index) {
        if (index < 0 || index >= this._pendingFiles.length) {
            return;
        }

        atom.workspace.open(this._pendingFiles[index].getPath());
    }

    _searchFiles(query, root) {
        // ignore spaces in query
        query = query.replace(/ /g, '');

        // skip over ignored directories
        for (let pattern of this._ignorePatterns().directory) {
            if (root.getPath().match(pattern)) {
                return [];
            }
        }

        let result = [];
        for (let e of root.getEntriesSync()) {
            if (e.isDirectory()) {
                result.push(...this._searchFiles(query, e));
            }
            else if (e.isFile()) {
                // check for a substring match, ignoring case, directory separators, and dots
                let path = e.getPath().toLowerCase().replace(/\/|\./g, '');
                if (path.includes(query)) {
                    // skip over ignored files
                    let skip = false;
                    for (let pattern of this._ignorePatterns().file) {
                        if (path.match(pattern)) {
                            skip = true;
                        }
                    }

                    if (!skip) {
                        result.push(e);
                    }
                }
            }
        }

        return result;
    }

    async _uiDelay() {
        // wait enough time for UI updates to actually happen
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }

    async COMMAND_TYPE_CANCEL(data) {
        this.state.set('alternatives', {});
    }

    async COMMAND_TYPE_CLOSE_TAB(data) {
        atom.workspace.getActivePane().destroyActiveItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_CLOSE_WINDOW(data) {
        this._dispatch('pane:close');
        await this._uiDelay();
    }

    async COMMAND_TYPE_COPY(data) {
        atom.clipboard.write(data.text);
    }

    async COMMAND_TYPE_CREATE_TAB(data) {
        atom.workspace.open();
        await this._uiDelay();
    }

    async COMMAND_TYPE_DIFF(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        atom.workspace.getActiveTextEditor().setText(data.source);
        this._moveCursor(data);
        this.delegate.focusEditor();
    }

    async COMMAND_TYPE_GET_EDITOR_STATE(data) {
        let result = {
            'source': '',
            'cursor': 0,
            'filename': ''
        };

        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return result;
        }

        let position = editor.getCursorBufferPosition();
        let row = position.row;
        let column = position.column;
        let text = editor.getText();

        // iterate through text, incrementing rows when newlines are found, and counting columsn when row is right
        let cursor = 0;
        let currentRow = 0;
        let currentColumn = 0;
        for (let i = 0; i < text.length; i++) {
            if (currentRow == row) {
                if (currentColumn == column) {
                    break;
                }

                currentColumn++;
            }

            if (text[i] == "\n") {
                currentRow++;
            }

            cursor++;
        }

        result.source = text;
        result.cursor = cursor;
        result.filename = atom.workspace.getActiveTextEditor().getPath()
        return result;
    }

    async COMMAND_TYPE_INVALID(data) {
    }

    async COMMAND_TYPE_NEXT_TAB(data) {
        atom.workspace.getActivePane().activateNextItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_OPEN_FILE(data) {
        // sort the project root paths by length, longest first
        let roots = atom.project.getPaths();
        roots.sort((a, b) => {
            return b.length - a.length;
        });

        let result = [];
        for (let e of atom.project.getDirectories()) {
            result.push(...this._searchFiles(data.path, e));
        }

        this._pendingFiles = result;
        let alternatives = result.map((e, i) => {
            // remove the longest root that's a prefix of the given path
            let path = e.getPath();
            for (let root of roots) {
                if (path.startsWith(root)) {
                    path = path.substring(root.length + 1);
                    break;
                }
            }

            return {
                sequences: [{
                    description: 'open',
                    code: path
                }]
            };
        });

        this.state.set('alternatives', {
            alternatives: alternatives,
            type: 'files'
        });

        this._skipNextUse = true;
    }

    async COMMAND_TYPE_PASTE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        let text = atom.clipboard.read();
        let source = editor.getText();
        let cursor = data.cursor;
        if (!cursor) {
            cursor = 0;
        }

        // paste on a new line if a direction is specified or we're pasting a full line
        if (text.endsWith('\n') || data.direction) {
            if (!text.endsWith('\n')) {
                text += '\n';
            }

            // for below (the default), move the cursor to the start of the next line
            if (!data.direction || data.direction == 'below') {
                for (; cursor < source.length; cursor++) {
                    if (source[cursor] == "\n") {
                        cursor++;
                        break;
                    }
                }
            }

            // for paste above, go to the start of the current line
            else {
                // if we're at the end of a line, then move the cursor back one, or else we'll paste below
                if (source[cursor] == "\n" && cursor > 0) {
                    cursor--;
                }

                for (; cursor >= 0; cursor--) {
                    if (source[cursor] == "\n") {
                        cursor++;
                        break;
                    }
                }
            }
        }

        editor.setText(source.substring(0, cursor) + text + source.substring(cursor));
        this._moveCursor(data);
    }

    async COMMAND_TYPE_PREVIOUS_TAB(data) {
        atom.workspace.getActivePane().activatePreviousItem();
        await this._uiDelay();
    }

    async COMMAND_TYPE_REDO(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.redo();
    }

    async COMMAND_TYPE_SAVE(data) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        if (editor.getPath()) {
            editor.save();
        }
        else {
            let path = atom.applicationDelegate.showSaveDialog();
            if (path) {
                editor.saveAs(path);
            }
        }
    }

    async COMMAND_TYPE_SET_EDITOR_STATUS(data) {
        let text = data.text;
        if (data.volume) {
            text += ' (' + Math.floor(data.volume * 100) + '%)';
        }

        this.state.set('status', text);
    }

    async COMMAND_TYPE_SPLIT(data) {
        this._dispatch('pane:split-' + data.direction + '-and-copy-active-item');
        await this._uiDelay();
    }

    async COMMAND_TYPE_SWITCH_TAB(data) {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
        await this._uiDelay();
    }

    async COMMAND_TYPE_UNDO(data) {
        atom.workspace.getActiveTextEditor().undo();
    }

    async COMMAND_TYPE_USE(data) {
        if (this._skipNextUse) {
            this._skipNextUse = false;
            return;
        }

        let index = data.index ? data.index - 1 : 0;
        this.state.set('highlighted', index);
        let alternatives = this.state.get('alternatives');
        if ('type' in alternatives && alternatives.type == 'files') {
            this._openPendingFileAtIndex(index);
        }
    }

    async COMMAND_TYPE_WINDOW(data) {
        let commands = {
            'left': 'on-left',
            'right': 'on-right',
            'up': 'above',
            'down': 'below'
        };

        this._dispatch('window:focus-pane-' + commands[data.direction]);
        await this._uiDelay();
    }
}
