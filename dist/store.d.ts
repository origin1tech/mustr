/// <reference types="node" />
import { MustrBase } from './base';
import { Transform } from 'stream';
import { IMustrOptions, VinylFile } from './interfaces';
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
    protected get(path: string): VinylFile;
    /**
     * Set
     * : Set a file in the store.
     * @param file the file to save.
     */
    protected set(file: VinylFile): this;
    /**
     * Each
     * : Iterator for stream.
     *
     * @param writer function for writing eack key and index.
     */
    protected each(writer: {
        (file?: VinylFile, index?: any): void;
    }): this;
    /**
     * Stream
     * : Streams calling iterator for each file in store.
     */
    protected stream(): Transform;
}
