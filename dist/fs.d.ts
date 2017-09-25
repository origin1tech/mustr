import { MustrStore } from './store';
import { IMustrOptions } from './interfaces';
export declare class MustrFileSys extends MustrStore {
    constructor(options?: IMustrOptions);
    /**
     * Extend
     * : Extends glob options.
     *
     * @param options glob options.
     */
    private extendOptions(options?);
    private basedir(files, relative);
    /**
     * Normalize File
     * : Normalize ensuring result is Vinyl File.
     *
     * @param path the path or File to return.
     */
    private normalizeFile(path);
    private normalizePath(path);
    /**
     * Globify
     * : Ensures file path is glob or append pattern.
     *
     * @param path the path or array of path and pattern.
     */
    private globify(path);
    /**
     * Exists
     * : Checks if a file exists in the store.
     *
     * @param path a path or file to inspect if exists.
     */
    private exists(path);
    /**
     * Is Empty
     * : Checks if file contents are null.
     *
     * @param path a path or file to inspect if is empty.
     */
    private isEmpty(path);
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
     * Read
     * : Reads a file or path returns interace for
     * reading as Buffer, JSON, or String.
     *
     * @param path the Vinyl File or file path.
     * @param def any default values.
     */
    private read(path, def?);
    /**
     * Write
     * : Writes file to store, accepts Buffer, String or Object
     *
     * @param path the path or Vinyl File to write.
     * @param contents the contents of the file to be written.
     * @param props additinal properties to extend to contents when object.
     * @param stat an optional file Stat object.
     */
    private write(path, contents, props?, stat?);
    private copy(src, dest, options?);
    /**
     * Move
     * : Moves file from one path to another.
     *
     * @param from the from path.
     * @param to the to path.
     * @param options glob options.
     */
    private move(from, to, options?);
    private append();
    /**
     * Remove
     * : Removes a file from the store.
     *
     * @param paths a path or array of paths to be removed.
     * @param options glob options used in removal.
     */
    private remove(paths, options?);
    private save();
    readonly fs: {
        read: any;
        write: any;
        copy: any;
        move: any;
        append: any;
        remove: any;
        save: any;
        exists: any;
        isEmpty: any;
        globify: any;
    };
}
