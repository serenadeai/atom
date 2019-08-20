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

  initialize() {
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
