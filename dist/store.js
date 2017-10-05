"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
var path_1 = require("path");
var vfile = require("vinyl-file");
var File = require("vinyl");
var through = require("through2");
var chek_1 = require("chek");
var MustrStore = (function (_super) {
    __extends(MustrStore, _super);
    function MustrStore(options) {
        var _this = _super.call(this, options) || this;
        _this.cwd = process.cwd();
        return _this;
    }
    /**
     * Load
     * : Loads a file or creates news on failed.
     *
     * @param path the file path to load.
     */
    MustrStore.prototype.load = function (path) {
        var file;
        try {
            file = vfile.readSync(path);
        }
        catch (ex) {
            file = new File({
                cwd: this.cwd,
                base: this.cwd,
                path: path,
                contents: null
            });
        }
        this._store[path] = file;
        return file;
    };
    /**
     * Get
     * : Gets file from store.
     *
     * @param path the path to get.
     */
    MustrStore.prototype.get = function (path) {
        path = path_1.resolve(path);
        return this._store[path] || this.load(path); // get from cache or load file.
    };
    /**
     * Set
     * : Set a file in the store.
     * @param file the file to save.
     */
    MustrStore.prototype.set = function (file) {
        this._store[file.path] = file;
        this.emit('change', file, this);
        return this;
    };
    /**
     * Each
     * : Iterator for stream.
     *
     * @param writer function for writing eack key and index.
     */
    MustrStore.prototype.each = function (writer) {
        var _this = this;
        chek_1.keys(this._store).forEach(function (k, i) {
            writer(_this._store[k], i);
        });
        return this;
    };
    /**
     * Stream
     * : Streams calling iterator for each file in store.
     */
    MustrStore.prototype.stream = function () {
        var _this = this;
        var stream = through.obj();
        setImmediate(function () {
            _this.each(stream.write);
            stream.end();
        });
        return stream;
    };
    return MustrStore;
}(base_1.MustrBase));
exports.MustrStore = MustrStore;
//# sourceMappingURL=store.js.map