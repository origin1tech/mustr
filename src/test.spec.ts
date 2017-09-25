import * as chai from 'chai';
import * as mocha from 'mocha';
import { parse, join, resolve } from 'path';
import * as fs from 'fs-extra';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { Mustr } from '../';

const mu = new Mustr();

describe('Mustr', () => {

  before((done) => {

    done();

  });

  it('should register a template named "DB".', () => {

  });

  after((done) => {
    done();
  });

});