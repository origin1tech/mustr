/// <reference types="node" />
import { EventEmitter } from 'events';
import { ErrorExtended } from './error';
import { Timbr } from 'timbr';
import { IMustrOptions, IMap } from './interfaces';
export declare class MustrBase extends EventEmitter {
    log: Timbr;
    options: IMustrOptions;
    constructor(options?: IMustrOptions);
    error(name: string, message: string, meta?: IMap<any>): ErrorExtended;
}
