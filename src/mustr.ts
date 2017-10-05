import { EventEmitter } from 'events';
import { Pargv } from 'pargv';
import { VStor } from 'vstor';
import { Timbr } from 'timbr';
import { extend } from 'chek';

import { IMustrOptions, IMap, RendererMethod } from './interfaces';
import { ErrorExtended } from './error';

const MUSTR_DEFAULTS: Partial<IMustrOptions> = {
  basePath: process.cwd()
};

export class Mustr {

  Engine: Object;
  renderer: RendererMethod;
  log: Timbr;
  vstor: VStor;

  options: IMustrOptions;

  constructor(options?: IMustrOptions) {
    this.options = extend<IMustrOptions>({}, MUSTR_DEFAULTS, options);
    this.log = new Timbr();
    this.vstor = new VStor();
  }

  private error(name: string, message: string, meta?: IMap<any>) {
    return new ErrorExtended(message, name, meta, 1);
  }

  prompts() {

  }

  install() {

  }

  render() {

  }

}