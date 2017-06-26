
import { Mustr } from './index';
import { resolve } from 'path';
import { Pargv, Chalk } from 'pargv';

let mustrConfig;
const pargv = new Pargv();
const chalk = new Chalk();

const mustrPath = resolve(process.cwd(), 'mustr.json');

// Try to load the mustr.json config if exists.
try {
  mustrConfig = require(mustrPath);
}
catch (ex) {
  mustrConfig = {};
}

// Create Mustr instance.
const mu = new Mustr(mustrConfig);

console.log();

function ensureConfig() {

  if (!mustrConfig || !mustrConfig.configDir)
    mu.log.warn('invalid or missing Mustr config, do you need to call mu init?').write().exit();

  const name = pargv.getCmd(0);
  const output = pargv.getCmd(1);
  const options = pargv.getFlags();

  if (options.f) {
    options.force = true;
    delete options.f;
  }

  return {
    name,
    output,
    options
  };

}

// Handler for help.
function help() {

  const padBtm = [0, 0, 1, 0];

  const msg =
    ' See additional required/optional arguments for each command below. \n';

  pargv
    .logo('Mustr', 'cyan')
    .ui(95)
    .join(chalk.magenta('Usage:'), 'mu', chalk.cyan('<cmd>'), '\n')
    .div({ text: chalk.bgBlue.white(msg) })
    .div(
    { text: chalk.cyan('help, h'), width: 35, padding: padBtm },
    { text: chalk.gray('displays help and usage information.'), width: 40, padding: padBtm }
    )
    .div(
    { text: chalk.cyan('init, i'), width: 35, padding: padBtm },
    { text: chalk.gray('initialize the application for use with Mustr.'), width: 40, padding: padBtm }
    )
    .div(
    { text: `${chalk.cyan('generate, g')} ${chalk.white('<template>')} ${chalk.magenta('[output]')}`, width: 35, padding: padBtm },
    { text: chalk.gray('generates and renders a template.'), width: 40, padding: padBtm }
    )
    .div(
    { text: chalk.white('<template>'), width: 35, padding: [0, 2, 0, 2] },
    { text: chalk.gray('template to generate and compile.'), width: 40 },
    { text: chalk.red('[required]'), align: 'right' }
    )
    .div(
    { text: chalk.white('[output]'), width: 35, padding: [0, 2, 0, 2] },
    { text: chalk.gray('output name/path for template'), width: 40, padding: padBtm }
    )
    .div(
    { text: `${chalk.cyan('rollback, r')} ${chalk.white('<name/id>')} ${chalk.magenta('[output]')}`, width: 35, padding: padBtm },
    { text: chalk.gray('Rolls back a template or component.'), width: 40, padding: padBtm }
    )
    .div(
    { text: chalk.white('<name/id>'), width: 35, padding: [0, 2, 0, 2] },
    { text: chalk.gray('the rollback id, index or template name.'), width: 40 },
  )
    .div(
    { text: chalk.white('[output]'), width: 35, padding: [0, 2, 0, 2] },
    { text: chalk.gray('output name/path for template'), width: 40, padding: padBtm }
    )
    .div(
    { text: `${chalk.cyan('show, s')} ${chalk.white('<type>')}`, width: 35, padding: padBtm },
    { text: chalk.gray('shows details/stats for the given type.'), width: 40, padding: padBtm }
    )
    .div(
    { text: chalk.white('<type>'), width: 35, padding: [0, 2, 0, 2] },
    { text: chalk.gray('currently there is only one type "rollbacks"'), width: 40 },
  )
    .show();
}

// Handler for initializing.
function init() {
  mu.init(pargv.f);
}

// Handler for generating templates.
function generate() {

  const parsed = ensureConfig();

  if (!parsed.name)
    mu.log.error('cannot generate template using name of undefined.\n').write().exit();

  // Generate the template.
  mu.render(parsed.name, parsed.output, parsed.options);

}

// Handler for rollbacks
function rollback() {

  const parsed = ensureConfig();
  let name: any = parsed.name;

  // check if is an index number.
  // if yes try to lookup the id
  // by its index.
  try {
    let idx: any;
    if (/^[0-9]+$/.test(name)) {
      idx = parseInt(parsed.name) - 1;
      if (idx >= 0) {
        const keys = Object.keys(mu.rollbacks);
        const key = keys[idx];
        if (key)
          name = key;
      }
    }
  }
  catch (ex) { }

  mu.rollback(parsed.name, parsed.output);

}

// Handler for show
function show() {

  const parsed = ensureConfig();

  function showRollbacks() {

    const rollbacks = mu.getRollbacks();
    const keys = Object.keys(rollbacks);
    const padBtm = [0, 0, 1, 0];
    const ui = pargv.ui(105);
    let i = keys.length;

    const hdrNo = { text: ` `, width: 5 };
    const hdrId = { text: `${chalk.underline.gray('ID')}`, width: 20 };
    const hdrTs = { text: `${chalk.underline.gray('Timestamp')}`, width: 30 };
    const hdrCt = { text: `${chalk.underline.gray('Count')}`, width: 10 };
    const hdrTpl = { text: `${chalk.underline.gray('Templates')}`, width: 35, padding: padBtm };

    ui.div(hdrNo, hdrId, hdrTs, hdrCt, hdrTpl);

    while (i--) {
      const key = keys[i];
      const rb = rollbacks[key];
      const no = { text: `${i + 1})`, width: 5 };
      const id = { text: `${chalk.cyan(rb.id)}`, width: 20 };
      const ts = { text: `${chalk.yellow(rb.timestamp)}`, width: 30 };
      const ct = { text: `${chalk.green(rb.count + '')}`, width: 10 };
      const tpl = { text: `${chalk.magenta(rb.templates.join(', '))}`, width: 35 };
      ui.div(no, id, ts, ct, tpl);
    }

    ui.show();

  }

  switch (parsed.name) {

    case 'r':
      showRollbacks();
      break;

    case 'rollbacks':
      showRollbacks();
      break;

    default:
      break;

  }

}

// Bind CLI methods.
pargv
  .action('help', 'h', help)
  .action('init', 'i', init)
  .action('generate', 'g', generate)
  .action('rollback', 'r', rollback)
  .action('show', 's', show)
  .action('*', () => {
    mu.log
      .warn('no command selected, did you mean to call "mu help"?')
      .write()
      .exit();
  })
  .parse();




