import App from './app';
import CommandHandlerBase from './shared/command-handler';
import Settings from './shared/settings';
import StateManager from './shared/state-manager';

declare var atom: any;

export default class CommandHandler implements CommandHandlerBase {
    private app: App;
    private settings: Settings;
    private state: StateManager;
    private pendingFiles: any[] = [];
    private ignorePatternsData: any = null;

    constructor(app: App, state: StateManager, settings: Settings) {
        this.app = app;
        this.state = state;
        this.settings = settings;
    }

    private dispatch(command: string) {
        let view = atom.workspace.getActivePane();
        let editor = atom.workspace.getActiveTextEditor();
        if (editor) {
            view = atom.views.getView(editor);
        }

        atom.commands.dispatch(view, command);
    }

    private focus() {
        this.app.focusEditor();
    }

    private ignorePatterns() {
        if (this.ignorePatternsData == null) {
            let directory = [];
            let file = [];

            for (let pattern of this.settings.get('ignore')) {
                if (pattern.endsWith('/')) {
                    directory.push(pattern.replace(/\/+$/g, ''));
                }
                else {
                    file.push(pattern);
                }
            }

            this.ignorePatternsData = { directory: new RegExp(directory.join('|')), file: new RegExp(file.join('|')) }
        }

        return this.ignorePatternsData;
    }

    private openPendingFileAtIndex(index: number) {
        if (index < 0 || index >= this.pendingFiles.length) {
            return;
        }

        atom.workspace.open(this.pendingFiles[index].getPath());
    }

    private searchFiles(query: string, root: any): any {
        // we want to look for any substring match, so replace spaces with wildcard
        let re = new RegExp(query.toLowerCase().replace(/ /g, '(.*)'));

        // skip over ignored directories
        if (root.getPath().match(this.ignorePatterns().directory)) {
            return [];
        }

        let result = [];
        let ignoreFile = this.ignorePatterns().file;
        for (let e of root.getEntriesSync()) {
            if (e.isDirectory()) {
                result.push(...this.searchFiles(query, e));
            }
            else if (e.isFile()) {
                // check for a substring match, ignoring case, directory separators, and dots
                let path = e.getPath().toLowerCase().replace(/\/|\./g, '');
                if (path.search(re) > -1 && (!ignoreFile || !path.match(ignoreFile))) {
                    result.push(e);
                }
            }
        }

        return result;
    }

    private setSourceAndCursor(source: string, cursor: number) {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        // iterate until the given substring index, incrementing rows and columns as we go
        let row = 0;
        let column = 0;
        for (let i = 0; i < cursor; i++) {
            column++;
            if (source[i] == '\n') {
                row++;
                column = 0;
            }
        }

        // set the text and the cursor in the same transcation, so undo/redo use the correct cursor position
        editor.transact(() => {
            editor.setText(source || '');
            editor.setCursorBufferPosition([row, column]);
        });
    }

    private async uiDelay() {
        // wait enough time for UI updates to actually happen
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }

    async COMMAND_TYPE_CANCEL(_data: any): Promise<any> {
        this.state.set('alternatives', {suggestions: true});
    }

    async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<any> {
        atom.workspace.getActivePane().destroyActiveItem();
        await this.uiDelay();
    }

    async COMMAND_TYPE_CLOSE_WINDOW(_data: any): Promise<any> {
        this.dispatch('pane:close');
        await this.uiDelay();
    }

    async COMMAND_TYPE_COPY(data: any): Promise<any> {
        if (data && data.text) {
            atom.clipboard.write(data.text);
        }
    }

    async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
        atom.workspace.open();
        await this.uiDelay();
    }

    async COMMAND_TYPE_DIFF(data: any): Promise<any> {
        this.setSourceAndCursor(data.source, data.cursor);
        this.focus();
    }

    async COMMAND_TYPE_GET_EDITOR_STATE(_data: any): Promise<any> {
        let result = {'source': '', 'cursor': 0, 'filename': ''};

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

            if (text[i] == '\n') {
                currentRow++;
            }

            cursor++;
        }

        result.source = text;
        result.cursor = cursor;
        result.filename = atom.workspace.getActiveTextEditor().getPath()
        return result;
    }

    async COMMAND_TYPE_GO_TO_DEFINITION(_data: any): Promise<any> {
    }

    async COMMAND_TYPE_INVALID(_data: any): Promise<any> {
    }

    async COMMAND_TYPE_LOGIN(data: any): Promise<any> {
        if (data.text !== '' && data.text !== undefined) {
            this.state.set('appState', 'READY');
        }
        else {
            this.state.set('loginError', 'Invalid email/password.');
        }
    }

    async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
        atom.workspace.getActivePane().activateNextItem();
        await this.uiDelay();
    }

    async COMMAND_TYPE_OPEN_FILE(data: any): Promise<any> {
        // sort the project root paths by length, longest first
        let roots = atom.project.getPaths();
        roots.sort((a: any[], b: any[]) => {
            return b.length - a.length;
        });

        let result = [];
        for (let e of atom.project.getDirectories()) {
            result.push(...this.searchFiles(data.path, e));
        }

        this.pendingFiles = result;
        let alternatives = result.map(e => {
            // remove the longest root that's a prefix of the given path
            let path = e.getPath();
            for (let root of roots) {
                if (path.startsWith(root)) {
                    path = path.substring(root.length + 1);
                    break;
                }
            }

            return {description: `open <code>${path}</code>`};
        });

        this.state.set('alternatives', {alternatives: alternatives, type: 'files'});
    }

    async COMMAND_TYPE_PASTE(data: any): Promise<any> {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        let text = atom.clipboard.read();
        let source = editor.getText();
        let insertionPoint = data.cursor || 0;

        // if we specify a direction, it means that we want to paste as a line, so add a newline
        let updatedCursor = insertionPoint;
        if (data.direction && !text.endsWith('\n')) {
            text += '\n';
        }

        // paste on a new line if a direction is specified or we're pasting a full line
        if (text.endsWith('\n') || data.direction) {
            // default to paste below if there's a newline at the end
            data.direction = data.direction || 'below';

            // for below (the default), move the cursor to the start of the next line
            if (data.direction == 'below') {
                for (; insertionPoint < source.length; insertionPoint++) {
                    if (source[insertionPoint] == '\n') {
                        insertionPoint++;
                        break;
                    }
                }
            }

            // for paste above, go to the start of the current line
            else if (data.direction == 'above') {
                // if we're at the end of a line, then move the cursor back one, or else we'll paste below
                if (source[insertionPoint] == '\n' && insertionPoint > 0) {
                    insertionPoint--;
                }

                for (; insertionPoint >= 0; insertionPoint--) {
                    if (source[insertionPoint] == '\n') {
                        insertionPoint++;
                        break;
                    }
                }
            }

            updatedCursor = insertionPoint;
        }

        // move the cursor to the end of the pasted text
        updatedCursor += text.length;
        if (text.endsWith('\n')) {
            updatedCursor--;
        }

        this.setSourceAndCursor(
            source.substring(0, insertionPoint) + text + source.substring(insertionPoint), updatedCursor
        );
    }

    async COMMAND_TYPE_PAUSE(_data: any): Promise<any> {
        this.state.set('listening', false);
        this.state.set('status', 'Paused');
    }

    async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
        atom.workspace.getActivePane().activatePreviousItem();
        await this.uiDelay();
    }

    async COMMAND_TYPE_REDO(_data: any): Promise<any> {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.redo();
    }

    async COMMAND_TYPE_SAVE(_data: any): Promise<any> {
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

    async COMMAND_TYPE_SET_EDITOR_STATUS(data: any): Promise<any> {
        let text = data.text;
        if (data.volume) {
            this.state.set('volume', Math.floor(data.volume * 100));
        }

        this.state.set('status', text);
    }

    async COMMAND_TYPE_SNIPPET(data: any): Promise<any> {
        this.state.set('loading', true);
        this.app.ipc!.send('SEND_TEXT', {text: 'add executed snippet ' + data.text});
    }

    async COMMAND_TYPE_SNIPPET_EXECUTED(data: any): Promise<any> {
        this.setSourceAndCursor(data.source, data.cursor);
        this.focus();
    }

    async COMMAND_TYPE_SPLIT(data: any): Promise<any> {
        this.dispatch('pane:split-' + data.direction + '-and-copy-active-item');
        await this.uiDelay();
    }

    async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
        atom.workspace.getActivePane().activateItemAtIndex(data.index - 1);
        await this.uiDelay();
    }

    async COMMAND_TYPE_UNDO(_data: any): Promise<any> {
        let editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }

        editor.undo();
    }

    async COMMAND_TYPE_USE(data: any): Promise<any> {
        let index = data.index ? data.index - 1 : 0;
        this.state.set('highlighted', index);
        let alternatives = this.state.get('alternatives');
        if ('type' in alternatives && alternatives.type == 'files') {
            this.openPendingFileAtIndex(index);
        }
    }

    async COMMAND_TYPE_WINDOW(data: any): Promise<any> {
        let commands: any = {'left': 'on-left', 'right': 'on-right', 'up': 'above', 'down': 'below'};

        this.dispatch('window:focus-pane-' + commands[data.direction]);
        await this.uiDelay();
    }
}
