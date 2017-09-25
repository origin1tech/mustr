import { EventEmitter } from 'events';
import { ErrorExtended } from './error';
import { Timbr } from 'timbr';
import { IMustrOptions, IMap } from './interfaces';
import { extend } from 'chek';

const MUSTR_DEFAULTS: IMustrOptions = {

};

export class MustrBase extends EventEmitter {


  log: Timbr;

  options: IMustrOptions;

  constructor(options?: IMustrOptions) {
    super();
    this.options = extend({}, MUSTR_DEFAULTS, options);
    this.log = new Timbr();
  }

  error(name: string, message: string, meta?: IMap<any>) {
    return new ErrorExtended(message, name, meta, 1);
  }


}