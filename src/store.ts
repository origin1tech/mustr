
import { MustrBase } from './base';
import { resolve } from 'path';
import { inherits } from 'util';
import { Transform, Duplex } from 'stream';
import * as vfile from 'vinyl-file';
import * as File from 'vinyl';
import * as through from 'through2';
import { keys } from 'chek';

import { IMap, IMustrOptions, IVinylOptions, VinylFile } from './interfaces';

export class MustrStore extends MustrBase {

  private cwd: string = process.cwd();
  private _store: IMap<VinylFile>;

  constructor(options?: IMustrOptions) {
    super(options);
  }

  /**
   * Load
   * : Loads a file or creates news on failed.
   *
   * @param path the file path to load.
   */
  private load(path) {
    let file;
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
    return file as VinylFile;
  }

  /**
   * Get
   * : Gets file from store.
   *
   * @param path the path to get.
   */
  private get(path: string): VinylFile {
    path = resolve(path);
    return this._store[path] || this.load(path); // get from cache or load file.
  }

  /**
   * Set
   * : Set a file in the store.
   * @param file the file to save.
   */
  private set(file: VinylFile) {
    this._store[file.path] = file;
    this.emit('change');
    return this;
  }

  /**
   * Each
   * : Iterator for stream.
   *
   * @param writer function for writing eack key and index.
   */
  private each(writer: { (file?: VinylFile, index?: any): void }) {
    keys(this._store).forEach((k, i) => {
      writer(this._store[k], i);
    });
    return this;
  }

  /**
   * Stream
   * : Streams calling iterator for each file in store.
   */
  private stream() {
    const stream: Transform = through.obj();
    setImmediate(() => {
      this.each(stream.write);
      stream.end();
    });
    return stream;
  }

  get store() {
    return {
      get: this.get.bind(this),
      set: this.set.bind(this),
      each: this.each.bind(this)
    };
  }

}
