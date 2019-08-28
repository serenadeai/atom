import * as Atom from "atom";

import BaseApp from "./shared/app";
import CommandHandler from "./command-handler";
import IPC from "./shared/ipc";
import Settings from "./shared/settings";

export default class App extends BaseApp {
  private commandHandler?: CommandHandler;
  private subscriptions?: Atom.CompositeDisposable;
  private panel?: Atom.Panel;

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

  hidePanel() {
    if (!this.panel) {
      return;
    }

    this.panel!.destroy();
  }

  showMessage(content: string) {
    this.hidePanel();

    const message = document.createElement("div");
    message.innerHTML = `
<div class="serenade-message">
  <div class="serenade-message-content">${content}</div>
  <a href="#" class="serenade-message-close">&times;</a>
</div>`;
    message.querySelector(".serenade-message-close")!.addEventListener("click", (e: any) => {
      e.preventDefault();
      this.hidePanel();
    });

    this.panel = atom.workspace.addTopPanel({ item: message });
  }

  showInstallMessage() {
    this.showMessage(
      `Download the new Serenade app to use Serenade with Atom. <a class="btn notification-download" href="https://serenade.ai/download" target="_blank">Download</a>`
    );
  }

  showNotRunningMessage() {
    this.showMessage("Open the Serenade app to use Serenade with Atom.");
  }

  async initialize() {
    if (this.ipc) {
      return;
    }

    this.settings = new Settings();
    this.commandHandler = new CommandHandler(this.settings);
    this.ipc = new IPC(this.commandHandler, 17375, () => {
      this.hidePanel();
    });
    this.commandHandler.pollActiveEditor();

    this.run();
  }
}
