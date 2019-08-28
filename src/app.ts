import * as Atom from "atom";

import BaseApp from "./shared/app";
import CommandHandler from "./command-handler";
import IPC from "./shared/ipc";
import Settings from "./shared/settings";

export default class App extends BaseApp {
  commandHandler?: CommandHandler;
  settings?: Settings;
  subscriptions?: Atom.CompositeDisposable;

  activate() {
    this.initialize();

    this.subscriptions = new Atom.CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "serenade:initialize": () => this.initialize()
      })
    );
  }

  deactivate() {
    this.destroy();
    this.subscriptions!.dispose();
  }

  showInstallMessage() {
    const message = document.createElement("div");
    message.innerHTML = `
<div class="serenade-message">
  Download the new Serenade app to use Serenade with Atom. <a class="btn notification-download" href="https://serenade.ai/download" target="_blank">Download</a>
</div>
`;
    atom.workspace.addTopPanel({ item: message });
  }

  async initialize() {
    if (this.ipc) {
      return;
    }

    this.settings = new Settings();
    this.commandHandler = new CommandHandler(this.settings);
    this.ipc = new IPC(this.commandHandler, 17375);
    this.commandHandler.pollActiveEditor();

    this.run();
  }
}
