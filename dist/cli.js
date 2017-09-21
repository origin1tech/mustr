"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _1 = require("./");
var path_1 = require("path");
var pargv_1 = require("pargv");
var lodash_1 = require("lodash");
var mustrConfig;
var pargv = new pargv_1.Pargv();
var mustrPath = path_1.resolve(process.cwd(), 'mustr.json');
var pkg = require(path_1.join(__dirname, '../package.json'));
// Try to load the mustr.json config if exists.
try {
    mustrConfig = require(mustrPath);
}
catch (ex) {
    mustrConfig = {};
}
// Create Mustr instance.
var mu = new _1.Mustr(mustrConfig);
var log = mu.log;
var colurs = mu.colurs;
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
        var idx = void 0;
        if (/^[0-9]+$/.test(name)) {
            idx = parseInt(name) - 1;
            if (idx >= 0) {
                var keys = Object.keys(mu._rollbacks);
                var key = keys[idx];
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
    function showRollbacks() {
        var rollbacks = mu.rollbacks.get();
        var keys = Object.keys(rollbacks);
        var padBtm = [0, 0, 1, 0];
        var layoutWidth = 80;
        var layout = pargv.layout(layoutWidth);
        var i = keys.length;
        var col1w = Math.floor(layoutWidth * .10);
        // const col4w = col1w;
        var col2w = Math.floor(layoutWidth * .50);
        // const col3w = Math.floor(layoutWidth * .25);
        var col5w = layoutWidth - (col1w + col2w);
        var hdrNo = { text: colurs.underline.gray('No.'), with: col1w };
        var hdrId = { text: "" + colurs.underline.gray('ID'), width: col2w };
        // const hdrTpl = { text: `${colurs.underline.gray('Templates')}`, width: col3w };
        // const hdrCt = { text: `${colurs.underline.gray('Count')}`, width: col4w };
        var hdrTs = { text: "" + colurs.underline.gray('Timestamp'), width: col5w, align: 'center' };
        layout.div({ text: colurs.blue('Rollbacks') + colurs.gray(' (current rollbacks)'), padding: [1, 0, 1, 0] });
        if (keys.length) {
            // layout.div(hdrNo, hdrId, hdrTpl, hdrCt, hdrTs); // create header.
            // layout.div(hdrNo, hdrId, hdrTpl, hdrTs); // create header.
            layout.div(hdrNo, hdrId, hdrTs); // create header.
            layout.repeat('-', null, padBtm);
        }
        while (i--) {
            var key = keys[i];
            var rb = rollbacks[key];
            var no = { text: i + 1 + ")", width: col1w };
            var id = { text: "" + colurs.cyan(rb.id), width: col2w };
            // const tpl = { text: `${colurs.gray(rb.templates.join(', '))}`, width: col3w };
            var tpl = { text: "" + colurs.gray(rb.templates.join(', ')) };
            // const ct = { text: `${colurs.yellow(rb.count + '')}`, width: col4w };
            var ts = { text: "" + colurs.magenta(rb.timestamp), width: col5w, align: 'center' };
            // layout.div(no, id, tpl, ct, ts); // output line.
            // layout.div(no, id, tpl, ts); // output line.
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
    if (lodash_1.includes(['r', 'rollbacks'], type)) {
        showRollbacks();
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
//# sourceMappingURL=cli.js.map