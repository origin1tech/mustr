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
var store_1 = require("./store");
var globby_1 = require("globby");
var path_1 = require("path");
var fs_1 = require("fs");
var interfaces_1 = require("./interfaces");
var chek_1 = require("chek");
var multimatch = require("multimatch");
var GLOB_DEFAULTS = {};
var MustrFileSys = (function (_super) {
    __extends(MustrFileSys, _super);
    function MustrFileSys(options) {
        return _super.call(this, options) || this;
    }
    /**
     * Extend
     * : Extends glob options.
     *
     * @param options glob options.
     */
    MustrFileSys.prototype.extendOptions = function (options) {
        return chek_1.extend({}, GLOB_DEFAULTS, options);
    };
    MustrFileSys.prototype.basedir = function (files, relative) {
        var _this = this;
        if (relative)
            files = chek_1.toArray(relative).map(function (f) { return path_1.resolve(files, f); });
        // splits path by fwd or back slashes.
        var splitPath = function (p) { return p.split((/\/+|\\+/)); };
        var result = files
            .slice(1)
            .reduce(function (p, f) {
            if (!f.match(/^([A-Za-z]:)?\/|\\/))
                throw _this.error('MustrFileSys', 'cannot get directory using base directory of undefined.');
            var s = splitPath(f);
            var i = 0;
            while (p[i] === f[i] && i < Math.min(p.length, s.length))
                i++;
            return p.slice(0, i); // slice match.
        }, splitPath(files[0]));
        return result.length > 1 ? result.join('/') : '/';
    };
    /**
     * Normalize File
     * : Normalize ensuring result is Vinyl File.
     *
     * @param path the path or File to return.
     */
    MustrFileSys.prototype.normalizeFile = function (path) {
        return chek_1.isString(path) ? this.store.get(path) : path;
    };
    MustrFileSys.prototype.normalizePath = function (path) {
    };
    /**
     * Globify
     * : Ensures file path is glob or append pattern.
     *
     * @param path the path or array of path and pattern.
     */
    MustrFileSys.prototype.globify = function (path) {
        var _this = this;
        if (chek_1.isArray(path))
            return path.reduce(function (f, p) { return f.concat(_this.globify(p)); });
        if (globby_1.hasMagic(path))
            return path;
        if (!fs_1.existsSync(path))
            return [path, '**'];
        var stats = fs_1.statSync(path);
        if (stats.isFile())
            return path;
        if (stats.isDirectory())
            return path_1.join(path, '**');
        throw this.error('MustrFileSys', 'path is neither a file or directory.');
    };
    /**
     * Exists
     * : Checks if a file exists in the store.
     *
     * @param path a path or file to inspect if exists.
     */
    MustrFileSys.prototype.exists = function (path) {
        var file = this.normalizeFile(path);
        return file.state !== interfaces_1.VinylState.deleted;
    };
    /**
     * Is Empty
     * : Checks if file contents are null.
     *
     * @param path a path or file to inspect if is empty.
     */
    MustrFileSys.prototype.isEmpty = function (path) {
        var file = this.normalizeFile(path);
        return file && file.contents === null;
    };
    /**
     * Exists With Value
     * : Ensures the file exists and has a value.
     *
     * @param path the path or file to ensure exists and has contents.
     */
    MustrFileSys.prototype.existsWithValue = function (path) {
        return this.exists(path) && !this.isEmpty(path);
    };
    /**
     * Is Deleted
     * : Inspects file check if has deleted flag.
     *
     * @param path the path or Vinyl File to inspect.
     */
    MustrFileSys.prototype.isDeleted = function (path) {
        return this.normalizeFile(path).state === interfaces_1.VinylState.deleted;
    };
    /**
     * Is JSON
     * : Checks if value is JSON.
     *
     * @param val the value to inspect as JSON.
     */
    MustrFileSys.prototype.isJSON = function (val) {
        try {
            return JSON.parse(val);
        }
        catch (ex) {
            return false;
        }
    };
    MustrFileSys.prototype.readAs = function (file, contents) {
        var _this = this;
        return {
            asBuffer: function () {
                return contents;
            },
            asJSON: function (extend) {
                var json = _this.isJSON(contents.toString());
                if (!json)
                    throw _this.error('MustrFileSys', file.relative + " could NOT be parsed as JSON.");
                return json;
            },
            asString: function () {
                return contents.toString();
            }
        };
    };
    /**
     * Read
     * : Reads a file or path returns interace for
     * reading as Buffer, JSON, or String.
     *
     * @param path the Vinyl File or file path.
     * @param def any default values.
     */
    MustrFileSys.prototype.read = function (path, def) {
        var file = this.normalizeFile(path);
        if (this.isDeleted(path) || this.isEmpty(path)) {
            if (!def)
                throw this.error('MustrFileSys', file.relative + " could NOT be found.");
            return def;
        }
        return this.readAs(file, file.contents);
    };
    /**
     * Write
     * : Writes file to store, accepts Buffer, String or Object
     *
     * @param path the path or Vinyl File to write.
     * @param contents the contents of the file to be written.
     * @param props additinal properties to extend to contents when object.
     * @param stat an optional file Stat object.
     */
    MustrFileSys.prototype.write = function (path, contents, props, stat) {
        if (props) {
            var tmp = props;
            if (tmp.isFIFO && tmp.ctime) {
                stat = props;
                props = undefined;
            }
        }
        var file = this.normalizeFile(path);
        if (!chek_1.isBuffer(contents) && !chek_1.isString(contents))
            throw this.error('MustrFileSys', "cannot write " + file.relative + " expected Buffer or String but got " + typeof contents);
        if (chek_1.isPlainObject(contents))
            contents = JSON.stringify(chek_1.extend(contents, props));
        file.state = this.isEmpty(file) ? interfaces_1.VinylState.new : interfaces_1.VinylState.modified;
        if (stat)
            file.stat = stat;
        file.contents = chek_1.isString(contents) ? new Buffer(contents) : contents;
        this.store.set(file);
        return this.readAs(file, file.contents);
    };
    MustrFileSys.prototype.copy = function (src, dest, options) {
        var _this = this;
        var copyFile = function (f, t, o) {
            if (!_this.exists(f))
                throw _this.error('MustrFileSys', "cannot copy from source " + f + " the path does NOT exist.");
        };
        dest = path_1.resolve(dest); // resolve output path from cwd.
        options = this.extendOptions(options);
        options.nodir = options.nodir || true; // exclude dir.
        var paths = globby_1.sync(this.globify(src), options);
        var matches = [];
        this.store.each(function (f) {
            if (multimatch([f.path], paths))
                matches.push(f.path);
        });
        paths = paths.concat(matches); // concat glob paths w/ store matches.
        if (!paths.length)
            throw this.error('MustrFileSys', "cannot copy using paths of undefined.");
        if (chek_1.isArray(src) || globby_1.hasMagic(src) || (!chek_1.isArray(src) && !this.exists(src))) {
            if (!this.exists(dest) || !chek_1.isDirectory(dest))
                throw this.error('MustrFileSys', 'destination must must be directory when copying multiple.');
        }
    };
    /**
     * Move
     * : Moves file from one path to another.
     *
     * @param from the from path.
     * @param to the to path.
     * @param options glob options.
     */
    MustrFileSys.prototype.move = function (from, to, options) {
        this.copy(from, to, options);
        this.remove(from, options);
    };
    MustrFileSys.prototype.append = function () {
        //
    };
    /**
     * Remove
     * : Removes a file from the store.
     *
     * @param paths a path or array of paths to be removed.
     * @param options glob options used in removal.
     */
    MustrFileSys.prototype.remove = function (paths, options) {
        var _this = this;
        options = this.extendOptions(options);
        var removeFile = function (p) {
            var f = _this.store.get(p);
            f.state = 'deleted';
            f.contents = null;
            _this.store.set(f);
        };
        paths =
            this.globify(chek_1.toArray(paths)
                .map(function (f) { return path_1.resolve(f); }));
        globby_1.sync(paths, options) // set as 'deleted';
            .forEach(function (p) { return removeFile(p); });
        this.store.each(function (f) {
            if (multimatch([f.path], paths).length)
                removeFile(f.path);
        });
    };
    MustrFileSys.prototype.save = function () {
    };
    Object.defineProperty(MustrFileSys.prototype, "fs", {
        get: function () {
            return {
                read: this.read.bind(this),
                write: this.write.bind(this),
                copy: this.copy.bind(this),
                move: this.move.bind(this),
                append: this.append.bind(this),
                remove: this.remove.bind(this),
                save: this.save.bind(this),
                exists: this.exists.bind(this),
                isEmpty: this.isEmpty.bind(this),
                globify: this.globify.bind(this)
            };
        },
        enumerable: true,
        configurable: true
    });
    return MustrFileSys;
}(store_1.MustrStore));
exports.MustrFileSys = MustrFileSys;
//# sourceMappingURL=fs.js.map