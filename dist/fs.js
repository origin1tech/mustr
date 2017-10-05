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
var globby_1 = require("globby");
var through = require("through2");
var path_1 = require("path");
var fs_1 = require("fs");
var rimraf_1 = require("rimraf");
var mkdirp_1 = require("mkdirp");
var multimatch = require("multimatch");
var os_1 = require("os");
var store_1 = require("./store");
var interfaces_1 = require("./interfaces");
var chek_1 = require("chek");
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
    /**
     * Common Dir
     * : Finds common path directory in array of paths.
     *
     * @param paths the file paths to find common directory for.
     * @param relative optional relative paths
     */
    MustrFileSys.prototype.commonDir = function (paths, relative) {
        var _this = this;
        if (relative)
            paths = chek_1.toArray(relative).map(function (f) { return path_1.resolve(paths, f); });
        // splits path by fwd or back slashes.
        var splitPath = function (p) { return p.split((/\/+|\\+/)); };
        var result = paths
            .slice(1)
            .reduce(function (p, f) {
            if (!f.match(/^([A-Za-z]:)?\/|\\/))
                throw _this.error('MustrFileSys', 'cannot get directory using base directory of undefined.');
            var s = splitPath(f);
            var i = 0;
            while (p[i] === f[i] && i < Math.min(p.length, s.length))
                i++;
            return p.slice(0, i); // slice match.
        }, splitPath(paths[0]));
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
        file.new = this.isEmpty(file);
        file.state = interfaces_1.VinylState.modified;
        if (stat)
            file.stat = stat;
        file.contents = chek_1.isString(contents) ? new Buffer(contents) : contents;
        this.store.set(file);
        return this.readAs(file, file.contents);
    };
    /**
     * Copy
     * : Copies source to destination or multiple sources to destination.
     *
     * @param from the path or paths as from source.
     * @param to the path or destination to.
     * @param options the glob options or content transform.
     * @param transform method for transforming content.
     */
    MustrFileSys.prototype.copy = function (from, to, options, transform) {
        var _this = this;
        var copyFile = function (_from, _to) {
            if (!_this.exists(_from))
                throw _this.error('MustrFileSys', "cannot copy from source " + _from + " the path does NOT exist.");
            var file = _this.store.get(_from);
            var contents = file.contents;
            if (transform)
                contents = transform(contents, file.path);
            _this.write(_to, contents, file.stat);
        };
        if (chek_1.isFunction(options)) {
            transform = options;
            options = undefined;
        }
        var rootPath;
        to = path_1.resolve(to); // resolve output path from cwd.
        options = (options || {});
        options.nodir = options.nodir || true; // exclude dir.
        var paths = globby_1.sync(this.globify(from), options);
        var matches = [];
        this.store.each(function (f) {
            if (multimatch([f.path], paths))
                matches.push(f.path);
        });
        paths = paths.concat(matches); // concat glob paths w/ store matches.
        if (!paths.length)
            throw this.error('MustrFileSys', "cannot copy using paths of undefined.");
        if (chek_1.isArray(from) || globby_1.hasMagic(from) || (!chek_1.isArray(from) && !this.exists(from))) {
            if (!this.exists(to) || !chek_1.isDirectory(to))
                throw this.error('MustrFileSys', 'destination must must be directory when copying multiple.');
            rootPath = this.commonDir(from);
        }
        paths.forEach(function (f) {
            if (rootPath)
                copyFile(from, path_1.join(from, path_1.relative(rootPath, f)));
            else
                copyFile(f, to);
        });
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
    /**
     * Append
     * : Appends a file with the specified contents.
     *
     * @param to the path of the file to append to.
     * @param content the content to be appended.
     * @param trim whether to not to trim trailing space.
     */
    MustrFileSys.prototype.append = function (to, content, trim) {
        var contents = this.read(to)
            .asString();
        trim = !chek_1.isUndefined(trim) ? trim : true;
        if (trim)
            contents = contents.replace(/\s+$/, '');
        this.write(to, contents + os_1.EOL + content);
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
            f.state = interfaces_1.VinylState.deleted;
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
    /**
     * Save
     * : Saves to store.
     *
     * @param filters transform filters which will be piped to stream.
     * @param fn a callback function on done.
     */
    MustrFileSys.prototype.save = function (filters, fn) {
        if (chek_1.isFunction(filters)) {
            fn = filters;
            filters = undefined;
        }
        var self = this;
        var store = this.store;
        filters = filters || [];
        var modifiy = through.obj(function (file, enc, done) {
            if (file.state === interfaces_1.VinylState.modified || (file.state === interfaces_1.VinylState.deleted && !file.new))
                this.push(file);
            done();
        });
        filters = [modifiy].concat(filters);
        var save = through.obj(function (file, enc, done) {
            store.set(file);
            if (file.state === interfaces_1.VinylState.modified) {
                var dir = path_1.dirname(file.path);
                if (!fs_1.existsSync(dir))
                    mkdirp_1.sync(dir);
                fs_1.writeFileSync(file.path, file.contents, {
                    mode: file.stat ? file.stat.mode : null
                });
            }
            else if (file.state === interfaces_1.VinylState.deleted) {
                rimraf_1.sync(file.path);
            }
            delete file.state;
            delete file.new;
            done();
        });
        filters.push(save);
        var stream = filters.reduce(function (stream, filter) {
            return stream.pipe(filter);
        }, this.store.stream());
    };
    return MustrFileSys;
}(store_1.MustrStore));
exports.MustrFileSys = MustrFileSys;
//# sourceMappingURL=fs.js.map