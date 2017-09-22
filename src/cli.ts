
import { Mustr } from './';
import { resolve, join } from 'path';
import { Pargv } from 'pargv';
import { Colurs } from 'colurs';
import { includes as contains } from 'lodash';

let mustrConfig;
const pargv = new Pargv();

const mustrPath = resolve(process.cwd(), 'mustr.json');
const pkg = require(join(__dirname, '../package.json'));

// Try to load the mustr.json config if exists.
try {
  mustrConfig = require(mustrPath);
}
catch (ex) {
  mustrConfig = {};
}

// Create Mustr instance.
const mu = new Mustr(mustrConfig);
const log = mu.log;
const colurs = mu.colurs;

function ensureConfig() {
  if (!mustrConfig || !mustrConfig.configDir)
    log
      .warn('invalid or missing Mustr config, do you need to call mu init?')
      .write()
      .exit();
}

// Handler for initializing.
function init(parsed, cmd) {
  mu.init(parsed.force);
}

// Handler for generating templates.
function generate(template, output, parsed, cmd) {

  ensureConfig();

  if (!template)
    log
      .error('cannot generate template using name of undefined.\n')
      .write()
      .exit();

  // Generate the template.
  mu.render(template, output, parsed);

}

// Handler for rollbacks
function rollback(name, output, parsed, cmd) {

  // check if is an index number.
  // if yes try to lookup the id
  // by its index.
  try {
    let idx: any;
    if (/^[0-9]+$/.test(name)) {
      idx = parseInt(name) - 1;
      if (idx >= 0) {
        const keys = Object.keys(mu._rollbacks);
        const key = keys[idx];
        if (key)
          name = key;
      }
    }
  }
  catch (ex) { }

  mu.rollback(name, output);

}

// Handler for show
function show(type, parsed, cmd) {

  ensureConfig();

  const layoutWidth = 80;
  const layout = pargv.layout(layoutWidth);
  const padBtm = [0, 0, 1, 0];

  function showRollbacks() {

    const rollbacks = mu.rollbacks.get();
    const keys = Object.keys(rollbacks);
    let i = keys.length;

    const col1w = Math.floor(layoutWidth * .10);
    const col2w = Math.floor(layoutWidth * .50);
    const col3w = layoutWidth - (col1w + col2w);


    const hdrNo = { text: colurs.underline.gray('No.'), with: col1w };
    const hdrId = { text: `${colurs.underline.gray('ID')}`, width: col2w };
    const hdrTs = { text: `${colurs.underline.gray('Timestamp')}`, width: col3w, align: 'center' };

    layout.div(
      { text: colurs.yellow('Rollbacks') as string + colurs.gray(' (current rollbacks)') as string, padding: [1, 0, 1, 0] }
    );

    if (keys.length) {
      layout.div(hdrNo, hdrId, hdrTs); // create header.
      layout.repeat('-', null, padBtm);
    }

    while (i--) {

      const key = keys[i];
      const rb = rollbacks[key];
      const no = { text: `${i + 1})`, width: col1w };
      const id = { text: `${colurs.cyan(rb.id)} ${colurs.gray('(' + (rb.count || '0') + ')')}`, width: col2w };
      const tpl = { text: `${colurs.gray(rb.templates.join(', '))}` };
      const ts = { text: `${colurs.magenta(rb.timestamp)}`, width: col3w, align: 'center' };

      layout.div(no, id, ts); // output line.
      layout.div({ text: '', width: col1w }, tpl);

    }

    if (!keys.length) {
      layout
        .div(colurs.italic.gray('0 records found.'))
        .div('');
    }

    layout.show(); // output the layout.
    console.log();

  }

  function showPaths() {

    const paths = mu.templates.paths();
    let i = 0;
    const hdrPath = { text: `${colurs.underline.gray('Path')}` };

    layout.div(
      { text: colurs.yellow('Paths') as string + colurs.gray(' (template paths)') as string, padding: [1, 0, 1, 0] }
    );

    if (paths.length) {
      layout.repeat('-', null, padBtm);
    }

    while (i < paths.length) {
      const p = paths[i];
      const path = { text: `${colurs.cyan(p)}` };
      layout.div(path);
      i++;
    }

    if (!paths.length) {
      layout
        .div(colurs.italic.gray('0 records found.'))
        .div('');
    }

    layout.show();
    console.log();

  }

  function showTemplates() {

    const comps = mu.templates.get();
    const keys = Object.keys(comps);

    let i = 0;
    const col1w = 20;
    const hdrName = { text: colurs.underline.gray('Template'), width: col1w };
    const hdrTpls = { text: `${colurs.underline.gray('Includes')}` };

    layout.div(
      { text: colurs.blue('Components') as string + colurs.gray(' (component templates)') as string, padding: [1, 0, 1, 0] }
    );

    if (keys.length) {
      layout.div(hdrName, hdrTpls); // create header.
      layout.repeat('-', null, padBtm);
    }

    while (i < keys.length) {
      const key = keys[i];
      const templates = comps[key].templates || [];
      const name = { text: colurs.cyan(key), width: col1w };
      const tpls = { text: colurs.gray(templates.join(', ')) };
      layout.div(name, tpls);
      i++;
    }

    if (!keys.length) {
      layout
        .div(colurs.italic.gray('0 records found.'))
        .div('');
    }

    layout.show();
    console.log();

  }

  function showCompnents() {

    const comps = mu.templates.components();
    const keys = Object.keys(comps);

    let i = 0;
    const col1w = 20;
    const hdrName = { text: colurs.underline.gray('Component'), width: col1w };
    const hdrTpls = { text: `${colurs.underline.gray('Includes')}` };

    layout.div(
      { text: colurs.blue('Components') as string + colurs.gray(' (component templates)') as string, padding: [1, 0, 1, 0] }
    );

    if (keys.length) {
      layout.div(hdrName, hdrTpls); // create header.
      layout.repeat('-', null, padBtm);
    }

    while (i < keys.length) {
      const key = keys[i];
      const templates = comps[key].templates || [];
      const name = { text: colurs.cyan(key), width: col1w };
      const tpls = { text: colurs.gray(templates.join(', ')) };
      layout.div(name, tpls);
      i++;
    }

    if (!keys.length) {
      layout
        .div(colurs.italic.gray('0 records found.'))
        .div('');
    }

    layout.show();
    console.log();

  }

  if (contains(['r', 'rollbacks'], type)) {
    showRollbacks();
  }

  else if (contains(['p', 'paths'], type)) {
    showPaths();
  }

  else if (contains(['c', 'components'], type)) {
    showCompnents();
  }

}

pargv
  .name('Mustr')
  .description('Scaffolding tool using Mustache templates.')
  .version(pkg.version)
  .license(pkg.license)

  .command('init.i --force.f', 'initializes project for use with Mustr.')
  .action(init)

  .command('generate.g <template> [output]', 'generates a new file from template.')
  .option('--ext, -e [ext]', 'extension for template.')
  .option('--casing, -c [casing]', 'component name casing.')
  .option('--filename-casing, -f [filename]', 'casing for filename.')
  .option('--rename, -r [rename]', 'rename file to this value.')
  .option('--output-dir, -o [output]', 'custom output directory.')
  .describe('template', 'the template used in generation.')
  .describe('output', 'template output override path.')
  .action(generate)

  .command('rollback.r [name] [output]', 'rollsback a previously generated template.')
  .describe('name', 'the name or id of the event to rollback.')
  .describe('output', 'template output override path.')
  .action(rollback)

  .command('show.s <type>', 'show details/stats for a given type.')
  .describe('type', 'the type to show info for.')
  .action(show)

  .completion()
  .exec();







