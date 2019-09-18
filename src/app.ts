import * as Atom from "atom";
import BaseApp from "./shared/app";
import CommandHandler from "./command-handler";

export default class App extends BaseApp {
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

  createCommandHandler(): CommandHandler {
    return new CommandHandler(this.ipcClient!, this.settings!);
  }

  deactivate() {
    this.destroy();
    this.subscriptions!.dispose();
  }

  hideMessage() {
    if (!this.panel) {
      return;
    }

    this.panel!.destroy();
  }

  showMessage(content: string) {
    this.hideMessage();

    const message = document.createElement("div");
    message.innerHTML = `
<div class="serenade-message">
  <div class="serenade-message-content">${content}</div>
  <a href="#" class="serenade-message-close">&times;</a>
</div>`;
    message.querySelector(".serenade-message-close")!.addEventListener("click", (e: any) => {
      e.preventDefault();
      this.hideMessage();
    });

    this.panel = atom.workspace.addTopPanel({ item: message });
  }

  port() {
    return 17375;
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
    if (this.ipcServer) {
      return;
    }

    this.run();
    (this.commandHandler! as CommandHandler).pollActiveEditor();
  }
}
