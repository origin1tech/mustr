
import { IMustrOptions } from './interfaces';
import { MustrFileSys } from './fs';

export class Mustr extends MustrFileSys {

  constructor(options?: IMustrOptions) {
    super(options);
  }

}
