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
    var layoutWidth = 80;
    var layout = pargv.layout(layoutWidth);
    var padBtm = [0, 0, 1, 0];
    function showRollbacks() {
        var rollbacks = mu.rollbacks.get();
        var keys = Object.keys(rollbacks);
        var i = keys.length;
        var col1w = Math.floor(layoutWidth * .10);
        var col2w = Math.floor(layoutWidth * .50);
        var col3w = layoutWidth - (col1w + col2w);
        var hdrNo = { text: colurs.underline.gray('No.'), with: col1w };
        var hdrId = { text: "" + colurs.underline.gray('ID'), width: col2w };
        var hdrTs = { text: "" + colurs.underline.gray('Timestamp'), width: col3w, align: 'center' };
        layout.div({ text: colurs.yellow('Rollbacks') + colurs.gray(' (current rollbacks)'), padding: [1, 0, 1, 0] });
        if (keys.length) {
            layout.div(hdrNo, hdrId, hdrTs); // create header.
            layout.repeat('-', null, padBtm);
        }
        while (i--) {
            var key = keys[i];
            var rb = rollbacks[key];
            var no = { text: i + 1 + ")", width: col1w };
            var id = { text: colurs.cyan(rb.id) + " " + colurs.gray('(' + (rb.count || '0') + ')'), width: col2w };
            var tpl = { text: "" + colurs.gray(rb.templates.join(', ')) };
            var ts = { text: "" + colurs.magenta(rb.timestamp), width: col3w, align: 'center' };
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
        var paths = mu.templates.paths();
        var i = 0;
        var hdrPath = { text: "" + colurs.underline.gray('Path') };
        layout.div({ text: colurs.yellow('Paths') + colurs.gray(' (template paths)'), padding: [1, 0, 1, 0] });
        if (paths.length) {
            layout.repeat('-', null, padBtm);
        }
        while (i < paths.length) {
            var p = paths[i];
            var path = { text: "" + colurs.cyan(p) };
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
        var comps = mu.templates.get();
        var keys = Object.keys(comps);
        var i = 0;
        var col1w = 20;
        var hdrName = { text: colurs.underline.gray('Template'), width: col1w };
        var hdrTpls = { text: "" + colurs.underline.gray('Includes') };
        layout.div({ text: colurs.blue('Components') + colurs.gray(' (component templates)'), padding: [1, 0, 1, 0] });
        if (keys.length) {
            layout.div(hdrName, hdrTpls); // create header.
            layout.repeat('-', null, padBtm);
        }
        while (i < keys.length) {
            var key = keys[i];
            var templates = comps[key].templates || [];
            var name = { text: colurs.cyan(key), width: col1w };
            var tpls = { text: colurs.gray(templates.join(', ')) };
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
        var comps = mu.templates.components();
        var keys = Object.keys(comps);
        var i = 0;
        var col1w = 20;
        var hdrName = { text: colurs.underline.gray('Component'), width: col1w };
        var hdrTpls = { text: "" + colurs.underline.gray('Includes') };
        layout.div({ text: colurs.blue('Components') + colurs.gray(' (component templates)'), padding: [1, 0, 1, 0] });
        if (keys.length) {
            layout.div(hdrName, hdrTpls); // create header.
            layout.repeat('-', null, padBtm);
        }
        while (i < keys.length) {
            var key = keys[i];
            var templates = comps[key].templates || [];
            var name = { text: colurs.cyan(key), width: col1w };
            var tpls = { text: colurs.gray(templates.join(', ')) };
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
    if (lodash_1.includes(['r', 'rollbacks'], type)) {
        showRollbacks();
    }
    else if (lodash_1.includes(['p', 'paths'], type)) {
        showPaths();
    }
    else if (lodash_1.includes(['c', 'components'], type)) {
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
//# sourceMappingURL=cli.js.map