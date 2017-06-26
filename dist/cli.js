"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var path_1 = require("path");
var pargv_1 = require("pargv");
var mustrConfig;
var pargv = new pargv_1.Pargv();
var chalk = new pargv_1.Chalk();
var mustrPath = path_1.resolve(process.cwd(), 'mustr.json');
// Try to load the mustr.json config if exists.
try {
    mustrConfig = require(mustrPath);
}
catch (ex) {
    mustrConfig = {};
}
// Create Mustr instance.
var mu = new index_1.Mustr(mustrConfig);
console.log();
function ensureConfig() {
    if (!mustrConfig || !mustrConfig.configDir)
        mu.log.warn('invalid or missing Mustr config, do you need to call mu init?').write().exit();
    var name = pargv.getCmd(0);
    var output = pargv.getCmd(1);
    var options = pargv.getFlags();
    if (options.f) {
        options.force = true;
        delete options.f;
    }
    return {
        name: name,
        output: output,
        options: options
    };
}
// Handler for help.
function help() {
    var padBtm = [0, 0, 1, 0];
    var msg = ' See additional required/optional arguments for each command below. \n';
    pargv
        .logo('Mustr', 'cyan')
        .ui(95)
        .join(chalk.magenta('Usage:'), 'mu', chalk.cyan('<cmd>'), '\n')
        .div({ text: chalk.bgBlue.white(msg) })
        .div({ text: chalk.cyan('help, h'), width: 35, padding: padBtm }, { text: chalk.gray('displays help and usage information.'), width: 40, padding: padBtm })
        .div({ text: chalk.cyan('init, i'), width: 35, padding: padBtm }, { text: chalk.gray('initialize the application for use with Mustr.'), width: 40, padding: padBtm })
        .div({ text: chalk.cyan('generate, g') + " " + chalk.white('<template>') + " " + chalk.magenta('[output]'), width: 35, padding: padBtm }, { text: chalk.gray('generates and renders a template.'), width: 40, padding: padBtm })
        .div({ text: chalk.white('<template>'), width: 35, padding: [0, 2, 0, 2] }, { text: chalk.gray('template to generate and compile.'), width: 40 }, { text: chalk.red('[required]'), align: 'right' })
        .div({ text: chalk.white('[output]'), width: 35, padding: [0, 2, 0, 2] }, { text: chalk.gray('output name/path for template'), width: 40, padding: padBtm })
        .div({ text: chalk.cyan('rollback, r') + " " + chalk.white('<name/id>') + " " + chalk.magenta('[output]'), width: 35, padding: padBtm }, { text: chalk.gray('Rolls back a template or component.'), width: 40, padding: padBtm })
        .div({ text: chalk.white('<name/id>'), width: 35, padding: [0, 2, 0, 2] }, { text: chalk.gray('the rollback id, index or template name.'), width: 40 })
        .div({ text: chalk.white('[output]'), width: 35, padding: [0, 2, 0, 2] }, { text: chalk.gray('output name/path for template'), width: 40, padding: padBtm })
        .div({ text: chalk.cyan('show, s') + " " + chalk.white('<type>'), width: 35, padding: padBtm }, { text: chalk.gray('shows details/stats for the given type.'), width: 40, padding: padBtm })
        .div({ text: chalk.white('<type>'), width: 35, padding: [0, 2, 0, 2] }, { text: chalk.gray('currently there is only one type "rollbacks"'), width: 40 })
        .show();
}
// Handler for initializing.
function init() {
    mu.init(pargv.f);
}
// Handler for generating templates.
function generate() {
    var parsed = ensureConfig();
    if (!parsed.name)
        mu.log.error('cannot generate template using name of undefined.\n').write().exit();
    // Generate the template.
    mu.render(parsed.name, parsed.output, parsed.options);
}
// Handler for rollbacks
function rollback() {
    var parsed = ensureConfig();
    var name = parsed.name;
    // check if is an index number.
    // if yes try to lookup the id
    // by its index.
    try {
        var idx = void 0;
        if (/^[0-9]+$/.test(name)) {
            idx = parseInt(parsed.name) - 1;
            if (idx >= 0) {
                var keys = Object.keys(mu.rollbacks);
                var key = keys[idx];
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
    var parsed = ensureConfig();
    function showRollbacks() {
        var rollbacks = mu.getRollbacks();
        var keys = Object.keys(rollbacks);
        var padBtm = [0, 0, 1, 0];
        var ui = pargv.ui(105);
        var i = keys.length;
        var hdrNo = { text: " ", width: 5 };
        var hdrId = { text: "" + chalk.underline.gray('ID'), width: 20 };
        var hdrTs = { text: "" + chalk.underline.gray('Timestamp'), width: 30 };
        var hdrCt = { text: "" + chalk.underline.gray('Count'), width: 10 };
        var hdrTpl = { text: "" + chalk.underline.gray('Templates'), width: 35, padding: padBtm };
        ui.div(hdrNo, hdrId, hdrTs, hdrCt, hdrTpl);
        while (i--) {
            var key = keys[i];
            var rb = rollbacks[key];
            var no = { text: i + 1 + ")", width: 5 };
            var id = { text: "" + chalk.cyan(rb.id), width: 20 };
            var ts = { text: "" + chalk.yellow(rb.timestamp), width: 30 };
            var ct = { text: "" + chalk.green(rb.count + ''), width: 10 };
            var tpl = { text: "" + chalk.magenta(rb.templates.join(', ')), width: 35 };
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
    .action('*', function () {
    mu.log
        .warn('no command selected, did you mean to call "mu help"?')
        .write()
        .exit();
})
    .parse();
//# sourceMappingURL=cli.js.map