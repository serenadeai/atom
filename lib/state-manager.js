'use babel';

export default class StateManager {
    constructor() {
        this._data = {};
        this._callbacks = {};
    }

    get(key) {
        return this._data[key];
    }

    set(key, value) {
        let previous = this._data[key];
        if (previous) {
            previous = JSON.parse(JSON.stringify(this._data[key]));
        }

        this._data[key] = value;
        if (key in this._callbacks) {
            for (let callback of this._callbacks[key]) {
                callback(value, previous);
            }
        }
    }

    subscribe(key, callback) {
        if (!(key in this._callbacks)) {
            this._callbacks[key] = [];
        }

        this._callbacks[key].push(callback);
    }
}
