/// <reference types="node" />
import { Transform } from 'stream';
import { Stats } from 'fs';
import { MustrStore } from './store';
import { IGlobOptions, IMustrOptions, VinylFile, IMap, IReadMethods, CopyTransform, SaveCallback } from './interfaces';
export declare class MustrFileSys extends MustrStore {
    constructor(options?: IMustrOptions);
    /**
     * Extend
     * : Extends glob options.
     *
     * @param options glob options.
     */
    private extendOptions(options?);
    /**
     * Common Dir
     * : Finds common path directory in array of paths.
     *
     * @param paths the file paths to find common directory for.
     * @param relative optional relative paths
     */
    private commonDir(paths, relative?);
    /**
     * Normalize File
     * : Normalize ensuring result is Vinyl File.
     *
     * @param path the path or File to return.
     */
    private normalizeFile(path);
    /**
     * Exists With Value
     * : Ensures the file exists and has a value.
     *
     * @param path the path or file to ensure exists and has contents.
     */
    private existsWithValue(path);
    /**
     * Is Deleted
     * : Inspects file check if has deleted flag.
     *
     * @param path the path or Vinyl File to inspect.
     */
    private isDeleted(path);
    /**
     * Is JSON
     * : Checks if value is JSON.
     *
     * @param val the value to inspect as JSON.
     */
    private isJSON(val);
    private readAs(file, contents);
    /**
     * Globify
     * : Ensures file path is glob or append pattern.
     *
     * @param path the path or array of path and pattern.
     */
    globify(path: string | string[]): any;
    /**
     * Exists
     * : Checks if a file exists in the store.
     *
     * @param path a path or file to inspect if exists.
     */
    exists(path: string | VinylFile): boolean;
    /**
     * Is Empty
     * : Checks if file contents are null.
     *
     * @param path a path or file to inspect if is empty.
     */
    isEmpty(path: string | VinylFile): boolean;
    /**
     * Read
     * : Reads a file or path returns interace for
     * reading as Buffer, JSON, or String.
     *
     * @param path the Vinyl File or file path.
     * @param def any default values.
     */
    read(path: string | VinylFile, def?: any): IReadMethods;
    /**
     * Write
     * : Writes file to store, accepts Buffer, String or Object
     *
     * @param path the path or Vinyl File to write.
     * @param contents the contents of the file to be written.
     * @param props additinal properties to extend to contents when object.
     * @param stat an optional file Stat object.
     */
    write(path: string | VinylFile, contents: string | Buffer | IMap<any>, props?: IMap<any> | Stats, stat?: Stats): IReadMethods;
    /**
     * Copy
     * : Copies source to destination or multiple sources to destination.
     *
     * @param from the path or paths as from source.
     * @param to the path or destination to.
     * @param options the glob options or content transform.
     * @param transform method for transforming content.
     */
    copy(from: string | string[], to: string, options?: IGlobOptions | CopyTransform, transform?: CopyTransform): void;
    /**
     * Move
     * : Moves file from one path to another.
     *
     * @param from the from path.
     * @param to the to path.
     * @param options glob options.
     */
    move(from: string, to: string, options?: IGlobOptions): void;
    /**
     * Append
     * : Appends a file with the specified contents.
     *
     * @param to the path of the file to append to.
     * @param content the content to be appended.
     * @param trim whether to not to trim trailing space.
     */
    append(to: string, content: string | Buffer, trim?: boolean): void;
    /**
     * Remove
     * : Removes a file from the store.
     *
     * @param paths a path or array of paths to be removed.
     * @param options glob options used in removal.
     */
    remove(paths: string | string[], options?: IGlobOptions): void;
    /**
     * Save
     * : Saves to store.
     *
     * @param filters transform filters which will be piped to stream.
     * @param fn a callback function on done.
     */
    save(filters: Transform[] | SaveCallback, fn: SaveCallback): void;
}
