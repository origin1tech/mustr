import * as chai from 'chai';
import * as mocha from 'mocha';
import { parse, join, resolve } from 'path';
import * as fs from 'fs-extra';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { Mustr } from '../src';

const mu = new Mustr({
  configDir: './src/blueprints',
  outputDir: './test/output',
  maxRollbacks: 0
});

// Disable logger so it doesn't muck up reporting.
mu.log.enabled(false);

let template, authorPartial;

authorPartial = '/**\n* Author: {{author}}\n* Copyright: {{copyright}}\n* Email: {{email}}\n * License: {{license}}\n*/';

describe('Mustr', () => {

  before((done) => {

    // Remove output test files from prev. run.
    fs.removeSync('./test/output');

    // Add rollbacks seed.
    fs.copySync('./test/seeds/rollback', './src/blueprints');

    // Since we have rollbacks disabled
    // we have to load manually after copying
    // in the seed data for testing.
    mu.loadRollbacks();

    // Register the template.
    mu.register({
      name: 'DB',
      template: 'example.class',
      partials: 'example.author'
    });

    // Update metadata at time of render as a test.
    template = mu.configure('DB', 'examples/db.tsx', {
      metadata: {
        author: 'Origin1 Technologies'
      }
    });

    done();

  });

  it('should register a template named "DB".', () => {

    // Ensure templates contains registered template.
    assert.deepProperty(mu.templates, 'db');

  });

  it('should generate the template "DB".', () => {

    // Parse the output path.
    const parsed = parse(template.outputPath);

    // Ensure component name and casing.
    assert.equal(template.metadata.$component.fullname, 'Db');

    // Ensure suffix and extension in output name.
    assert.equal(parsed.base, 'db.tsx');

  });

  it('should generate a static template', (done) => {
    // Doing this the long way to show each step.
    let tplt;
    mu.register('static.template', 'My name is {{name}}.');
    tplt = mu.configure('static.template', { noOutput: true, metadata: { name: 'Bob Smith' } });
    mu.render(tplt, (err, data) => {
      assert.equal(data.rendered, 'My name is Bob Smith.');
      done();
    });

  });

  it('should generate a template from a static path.', (done) => {

    let tplt;
    mu.register('static.path', './src/blueprints/examples/example.class.tpl');
    tplt = mu.configure('static.path');
    assert.equal(tplt.name, 'example.class');
    done();

  });

  it('should output the generated DbExample template.', (done) => {

    // Render the template.
    mu.render(template, () => {

      // Ensure the file was output and exists.
      assert.equal(fs.existsSync(template.outputPath), true);

      done();

    });

  });

  it('should inject value into rendered template.', (done) => {

    mu.inject('examples/db.tsx', '// INJECT', 'after', "import * as async from 'async';", done);

  });

  it('should reindex correct sort order prune invalid entry 1498418601830-db', () => {

    assert.include(Object.keys(mu.rollbacks), '1498418601830-db');
    mu.reindexRollbacks();
    const keys = Object.keys(mu.rollbacks);

    // This key should have been pruned for bad/missing config.
    assert.notInclude(keys, '1498418601830-db');

    // This key should be sorted to last record now.
    assert.equal(keys.pop(), '1498418608501-db');

  });

  it('should remove a rollback 1498159408501-db', () => {

    const id = '1498159408501-db';

    mu.removeRollbacks(id);
    assert.notInclude(Object.keys(mu.rollbacks), id);

    // The rollback folder with dummy data should also no longer exist.
    assert.equal(false, fs.existsSync('./src/blueprints/rollbacks/' + id));

  });

  it('should remove rollbacks prior to 2017-06-24T19:23:21.830Z.', () => {
    const len = Object.keys(mu.rollbacks).length;
    mu.removeRollbacks(new Date('2017-06-24T19:23:21.830Z'));
    assert.equal(Object.keys(mu.rollbacks).length, len - 1);
  });

  it('should remove try to remove 2 rollbacks but fallback to 1 preserving last.', () => {
    mu.removeRollbacks(2);
    assert.equal(1, Object.keys(mu.rollbacks).length);
  });

  it('should rollback the last rollback in list.', () => {
    const lastId = Object.keys(mu.rollbacks).pop();
    mu.rollback();
    assert.equal(false, fs.existsSync('./test/output/examples/db.tsx'));
    assert.notInclude(Object.keys(mu.rollbacks), lastId);
  });

  after((done) => {
    mu.log.enabled(true);
    fs.writeFileSync('./src/blueprints/rollbacks.json', JSON.stringify({}, null, 2));
    fs.emptyDirSync('./src/blueprints/rollbacks');
    done();
  });

});