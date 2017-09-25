import { MustrBase } from './base';
import { IMustrOptions } from './interfaces';
export declare class MustrStore extends MustrBase {
    private cwd;
    private _store;
    constructor(options?: IMustrOptions);
    /**
     * Load
     * : Loads a file or creates news on failed.
     *
     * @param path the file path to load.
     */
    private load(path);
    /**
     * Get
     * : Gets file from store.
     *
     * @param path the path to get.
     */
    private get(path);
    /**
     * Set
     * : Set a file in the store.
     * @param file the file to save.
     */
    private set(file);
    /**
     * Each
     * : Iterator for stream.
     *
     * @param writer function for writing eack key and index.
     */
    private each(writer);
    /**
     * Stream
     * : Streams calling iterator for each file in store.
     */
    private stream();
    readonly store: {
        get: any;
        set: any;
        each: any;
    };
}
