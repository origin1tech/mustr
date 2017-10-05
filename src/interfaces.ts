import { IPargvOptions } from 'pargv';
import { ITimbrOptions } from 'timbr';
import { IVStorOptions } from 'vstor';

export type RendererMethod = (template: string, context: IMap<any>, partials?: any) => string;

export interface IMap<T> {
  [key: string]: T;
}

export interface IMustrOptions {
  Engine: Object;
  renderer: RendererMethod;
  basePath: string;
}
