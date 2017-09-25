import { MustrStore } from './store';
import { sync, hasMagic as isGlob } from 'globby';
import { resolve, join } from 'path';
import { existsSync, statSync, Stats } from 'fs';
import { IGlobOptions, IMustrOptions, VinylFile, VinylState, IMap, IReadMethods, IWriteMethods } from './interfaces';
import { extend, isString, isPlainObject, toArray, isArray, isBuffer, isDirectory, isFile } from 'chek';
import * as multimatch from 'multimatch';

const GLOB_DEFAULTS = {};

export class MustrFileSys extends MustrStore {

  constructor(options?: IMustrOptions) {
    super(options);
  }

  /**
   * Extend
   * : Extends glob options.
   *
   * @param options glob options.
   */
  private extendOptions(options?: IGlobOptions) {
    return extend({}, GLOB_DEFAULTS, options);
  }

  private basedir(files: string | string[], relative: string | string[]) {

    if (relative)
      files = toArray(relative).map(f => resolve(files, f));

    // splits path by fwd or back slashes.
    const splitPath = p => p.split((/\/+|\\+/));

    const result =
      (files as string[])
        .slice(1)
        .reduce((p, f) => {
          if (!f.match(/^([A-Za-z]:)?\/|\\/))
            throw this.error('MustrFileSys', 'cannot get directory using base directory of undefined.');
          const s = splitPath(f);
          let i = 0;
          while (p[i] === f[i] && i < Math.min(p.length, s.length))
            i++;
          return p.slice(0, i); // slice match.
        }, splitPath(files[0]));

    return result.length > 1 ? result.join('/') : '/';

  }

  /**
   * Normalize File
   * : Normalize ensuring result is Vinyl File.
   *
   * @param path the path or File to return.
   */
  private normalizeFile(path: string | VinylFile): VinylFile {
    return isString(path) ? this.store.get(path) : path;
  }

  private normalizePath(path: string) {

  }

  /**
   * Globify
   * : Ensures file path is glob or append pattern.
   *
   * @param path the path or array of path and pattern.
   */
  private globify(path: string | string[]) {

    if (isArray(path)) // recursion if array.
      return (path as string[]).reduce((f, p) => f.concat(this.globify(p)));

    if (isGlob(path)) // already a glob.
      return path;

    if (!existsSync(<string>path)) // add pattern to match dirs.
      return [<string>path, '**'];

    const stats = statSync(<string>path);

    if (stats.isFile())
      return path;

    if (stats.isDirectory()) // if dir append glob pattern.
      return join(<string>path, '**');

    throw this.error('MustrFileSys', 'path is neither a file or directory.');

  }

  /**
   * Exists
   * : Checks if a file exists in the store.
   *
   * @param path a path or file to inspect if exists.
   */
  private exists(path: string | VinylFile) {
    const file = this.normalizeFile(path);
    return file.state !== VinylState.deleted;
  }

  /**
   * Is Empty
   * : Checks if file contents are null.
   *
   * @param path a path or file to inspect if is empty.
   */
  private isEmpty(path: string | VinylFile) {
    const file = this.normalizeFile(path);
    return file && file.contents === null;
  }

  /**
   * Exists With Value
   * : Ensures the file exists and has a value.
   *
   * @param path the path or file to ensure exists and has contents.
   */
  private existsWithValue(path: string | VinylFile) {
    return this.exists(path) && !this.isEmpty(path);
  }

  /**
   * Is Deleted
   * : Inspects file check if has deleted flag.
   *
   * @param path the path or Vinyl File to inspect.
   */
  private isDeleted(path: string | VinylFile) {
    return this.normalizeFile(path).state === VinylState.deleted;
  }

  /**
   * Is JSON
   * : Checks if value is JSON.
   *
   * @param val the value to inspect as JSON.
   */
  private isJSON(val: any) {
    try {
      return JSON.parse(val);
    }
    catch (ex) {
      return false;
    }

  }

  private readAs(file: VinylFile, contents: Buffer | NodeJS.ReadableStream): IReadMethods {
    return {
      asBuffer: (): Buffer | NodeJS.ReadableStream => {
        return contents;
      },
      asJSON: <T>(extend?: IMap<any>): T => {
        const json = this.isJSON(contents.toString());
        if (!json)
          throw this.error('MustrFileSys', `${file.relative} could NOT be parsed as JSON.`);
        return json;
      },
      asString: () => {
        return contents.toString();
      }
    };
  }

  /**
   * Read
   * : Reads a file or path returns interace for
   * reading as Buffer, JSON, or String.
   *
   * @param path the Vinyl File or file path.
   * @param def any default values.
   */
  private read(path: string | VinylFile, def?: any): IReadMethods {
    const file = this.normalizeFile(path);
    if (this.isDeleted(path) || this.isEmpty(path)) {
      if (!def)
        throw this.error('MustrFileSys', `${file.relative} could NOT be found.`);
      return def;
    }
    return this.readAs(file, file.contents);
  }

  /**
   * Write
   * : Writes file to store, accepts Buffer, String or Object
   *
   * @param path the path or Vinyl File to write.
   * @param contents the contents of the file to be written.
   * @param props additinal properties to extend to contents when object.
   * @param stat an optional file Stat object.
   */
  private write(path: string | VinylFile, contents: string | Buffer | IMap<any>, props?: IMap<any> | Stats, stat?: Stats): IReadMethods {
    if (props) { // bit hacky but...
      const tmp = (props as Stats);
      if (tmp.isFIFO && tmp.ctime) {
        stat = <Stats>props;
        props = undefined;
      }
    }
    const file = this.normalizeFile(path);
    if (!isBuffer(contents) && !isString(contents))
      throw this.error('MustrFileSys', `cannot write ${file.relative} expected Buffer or String but got ${typeof contents}`);
    if (isPlainObject(contents))
      contents = JSON.stringify(extend(contents, props));
    file.state = this.isEmpty(file) ? VinylState.new : VinylState.modified;
    if (stat)
      file.stat = stat;
    file.contents = isString(contents) ? new Buffer(<string>contents) : <Buffer>contents;
    this.store.set(file);
    return this.readAs(file, file.contents);
  }

  private copy(src: string | string[], dest: string, options?: IGlobOptions) {

    const copyFile = (f, t, o) => {
      if (!this.exists(f))
        throw this.error('MustrFileSys', `cannot copy from source ${f} the path does NOT exist.`);

    };

    dest = resolve(dest); // resolve output path from cwd.
    options = this.extendOptions(options);
    options.nodir = options.nodir || true; // exclude dir.

    let paths = sync(this.globify(src), options);
    const matches = [];
    this.store.each((f: VinylFile) => { // iterate store find matches.
      if (multimatch([f.path], paths))
        matches.push(f.path);
    });
    paths = paths.concat(matches); // concat glob paths w/ store matches.

    if (!paths.length)
      throw this.error('MustrFileSys', `cannot copy using paths of undefined.`);

    if (isArray(src) || isGlob(src) || (!isArray(src) && !this.exists(<string>src))) {
      if (!this.exists(dest) || !isDirectory(dest))
        throw this.error('MustrFileSys', 'destination must must be directory when copying multiple.');

    }

  }

  /**
   * Move
   * : Moves file from one path to another.
   *
   * @param from the from path.
   * @param to the to path.
   * @param options glob options.
   */
  private move(from: string, to: string, options?: IGlobOptions) {
    this.copy(from, to, options);
    this.remove(from, options);
  }

  private append() {
    //
  }

  /**
   * Remove
   * : Removes a file from the store.
   *
   * @param paths a path or array of paths to be removed.
   * @param options glob options used in removal.
   */
  private remove(paths: string | string[], options?: IGlobOptions) {

    options = this.extendOptions(options);

    const removeFile = (p) => {
      const f = this.store.get(p);
      f.state = 'deleted';
      f.contents = null;
      this.store.set(f);
    };

    paths =
      this.globify(toArray(paths)
        .map(f => resolve(f)));

    sync(paths, options) // set as 'deleted';
      .forEach(p => removeFile(p));

    this.store.each((f) => { // iterate store if match remove.
      if (multimatch([f.path], paths).length)
        removeFile(f.path);
    });

  }

  private save() {

  }

  get fs() {

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

  }

}