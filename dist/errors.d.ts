import { IMap } from './interfaces';
export declare class MustrError extends Error {
    meta: IMap<any>;
    stacktrace: string[];
    constructor(message: string, name?: string | number, prune?: number | IMap<any>, meta?: IMap<any>);
    /**
     * Split
     * : Splits a stack by newline char.
     *
     * @param stack the stack to split.
     */
    split(stack?: string | string[]): string[];
    /**
     * Prune
     * : Prunes a stack by the count specified.
     *
     * @param prune the rows to be pruned.
     * @param stack an optional stack to use as source.
     */
    prune(prune?: number, stack?: string | string[]): string[];
    /**
     * Frames
     * : Breaks out stack trace into stack frames.
     *
     * @param stack the stack to get stack frames for.
     */
    frames(stack?: string | string[]): void;
}
