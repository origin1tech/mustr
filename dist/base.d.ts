import { ErrorExtended } from './error';
import { Timbr } from 'timbr';
import { IMustrOptions, IMap, RendererMethod } from './interfaces';
export declare class MustrBase {
    Engine: Object;
    renderer: RendererMethod;
    protected log: Timbr;
    options: IMustrOptions;
    constructor(options?: IMustrOptions);
    protected error(name: string, message: string, meta?: IMap<any>): ErrorExtended;
}
