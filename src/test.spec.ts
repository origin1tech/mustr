import * as chai from 'chai';
import * as mocha from 'mocha';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { Mustr } from '../';
const mu = new Mustr();

describe('Mustr', () => {

  it('should be instance of Mustr.', () => {
    assert.equal(true, mu instanceof Mustr);
  });

});