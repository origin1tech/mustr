"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs_extra_1 = require("fs-extra");
var readline = require("readline");
var path_1 = require("path");
var pargv_1 = require("pargv");
var os_1 = require("os");
var glob = require("glob");
var di = require("detect-indent");
var async_1 = require("async");
var lodash_1 = require("lodash");
var events_1 = require("events");
var fm = require("front-matter");
var Mustache = require("mustache");
var chalk = new pargv_1.Chalk();
var defaults = {
    configDir: './mustr',
    outputDir: './src',
    templateExt: '.tpl',
    autoLoad: true,
    autoRegister: true,
    Engine: undefined,
    renderer: undefined,
    maxRollbacks: 15 // max rollbacks to store set to 0 to disable.
};
var Mustr = (function (_super) {
    __extends(Mustr, _super);
    function Mustr(options) {
        var _this = _super.call(this) || this;
        _this.loaded = false;
        _this.rollbacksDir = 'rollbacks';
        _this.rollbackIdExp = /^[0-9]+-[a-z0-9]+(-[a-z0-9]+)?$/;
        // Utils
        _this.cwd = process.cwd().toLowerCase();
        // Parsed templates.
        _this.templates = {};
        _this.components = {};
        _this.rollbacks = {};
        _this.options = lodash_1.extend({}, defaults, options);
        _this.log = pargv_1.logger();
        _this.configPath = path_1.resolve(_this.cwd, _this.options.configDir);
        _this.templatesPath = path_1.resolve(_this.cwd, path_1.join(_this.options.configDir, '/**/*.tpl')).toLowerCase();
        // Resolve the base directory.
        _this.outputPath = path_1.resolve(_this.cwd, _this.options.outputDir).toLowerCase();
        // Resolve the config path.
        _this.registerPath = path_1.resolve(_this.cwd, _this.options.configDir, 'register.js').toLowerCase();
        // Normalized the template extension.
        _this.options.templateExt = _this.normalizedExt(_this.options.templateExt);
        // Path to rollbacks register.
        _this.rollbacksPath = path_1.resolve(_this.cwd, path_1.join(_this.options.configDir, 'rollbacks.json'));
        _this.tplexp = new RegExp(_this.options.templateExt + '$');
        _this.Engine = _this.options.Engine || Mustache;
        _this.renderer = _this.options.renderer || Mustache.render;
        _this.load();
        return _this;
    }
    /**
     * Has Matter
     * Tests if string contains front matter.
     *
     * @param str the string to inspect.
     */
    Mustr.prototype.hasMatter = function (str) {
        return str.indexOf('---') > -1;
    };
    /**
     * Has Template
     * Loosly check if string contains template chars.
     *
     * @param str the string to inspect.
     */
    Mustr.prototype.hasTemplate = function (str) {
        return str.indexOf('{{') > -1;
    };
    /**
     * Try Require
     * Tries to require a module logging error if failed.
     *
     * @param path the module path to be required.
     */
    Mustr.prototype.tryRequire = function (path) {
        try {
            return require(path);
        }
        catch (ex) {
            this.log.error("failed to require module at " + path + ".").exit();
        }
    };
    /**
     * Normalize Extension
     * Ensures extension begins with "."
     *
     * @param ext the extension to be normalized.
     */
    Mustr.prototype.normalizedExt = function (ext) {
        return "." + ext.replace(/^\./, '');
    };
    /**
     * Normalize
     * Parses/normalizes a template name, path or static template string.
     * When passing a name it searches loaded template paths and matches
     * the filename to the template name passed.
     *
     * @param template the template name, path or static template string.
     */
    Mustr.prototype.normalize = function (template) {
        var rawTemplate, templatePath, templatePathNormalized, templateName, templateExt;
        var EXT_EXP = new RegExp(this.options.templateExt + "$");
        var parsedPath, parsedNormalized, isStatic;
        // When has extension readfile.
        if (EXT_EXP.test(template)) {
            // Static paths should resolve from working directory.
            template = path_1.resolve(this.cwd, template);
            // If template doesn't exist error & exit.
            if (!fs_extra_1.existsSync(template))
                this.log.error("failed to resolve static template at path " + template + ". Exclude '.tpl from template name to reference loaded template.").exit();
            // Save the template path.
            templatePath = template;
        }
        else if (!this.hasMatter(template) && !this.hasTemplate(template)) {
            var filtered = this.templatesGlob.filter(function (t) {
                return path_1.parse(t).name === template;
            })[0];
            if (!filtered) {
                this.log.error("failed to resolve template for name " + template + ".");
                return;
            }
            templatePath = filtered;
        }
        // If template path exists normalize it.
        if (templatePath) {
            templatePath = templatePath.toLowerCase();
            // We'll resolve the template later
            // set undefined as this is NOT a
            // static template.
            template = undefined;
            // Remove the template ext.
            templatePathNormalized = templatePath.replace(EXT_EXP, '');
            // Parse paths.
            parsedPath = path_1.parse(templatePath);
            parsedNormalized = path_1.parse(templatePathNormalized);
            // Get the name from the path.
            templateName = parsedPath.name;
            // Template may contain extension in path.
            // So we make sure we used the normalized path
            // which exclusdes the template extension.
            templateExt = parsedNormalized.ext;
            templateName = templateName.toLowerCase();
            templateExt = templateExt.toLowerCase();
            templatePathNormalized = templatePathNormalized.toLowerCase();
        }
        else {
            rawTemplate = template;
            isStatic = true;
        }
        // Get the template's configuration.
        var config = {
            name: templateName,
            path: templatePath,
            ext: templateExt,
            pathNormalized: templatePathNormalized,
            raw: rawTemplate,
            isStatic: isStatic,
            partials: {}
        };
        // Return ITemplate
        return config;
    };
    /**
     * Normalize Name
     * Removes extention from template name.
     *
     * @param name the template name to normalize.
     */
    Mustr.prototype.normalizeName = function (name) {
        if (!lodash_1.isString(name))
            return name;
        return name.toLowerCase().replace(this.tplexp, '').replace(/^\.?\/?/, '');
    };
    /**
     * Truncate
     * Nothing special, cheesy truncation...move along.
     *
     * @param str the string to be truncated.
     * @param max the max len before truncating.
     */
    Mustr.prototype.truncate = function (str, max) {
        return str.length > max ? str.substr(0, max - 1) + '...' : str;
    };
    /**
     * Get Partial
     *
     * @param partial the partial to get.
     */
    Mustr.prototype.getPartial = function (partial) {
        var partialName = partial.toLowerCase();
        var existing = this.templates[partialName];
        if (existing)
            return existing;
        partial = this.normalize(partial);
        if (!partial) {
            this.log.warn("the partial " + partialName + " could not be normalized.");
            return;
        }
        partial.isPartial = true;
        return partial;
    };
    /**
     * Add Partials
     *
     * @param template the template to add partials to.
     * @param args the list of partials to add.
     */
    Mustr.prototype.addPartials = function (template) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!args.length)
            return;
        if (lodash_1.isPlainObject(args[0])) {
            var _partials_1 = args[0];
            Object.keys(_partials_1).forEach(function (p) {
                var partial = _this.getPartial(_partials_1[p]);
                if (!partial)
                    return;
                partial.name = p.toLowerCase();
                template.partials[partial.name] = partial;
            });
        }
        else {
            // Flatten the array.
            args = [].concat.apply([], args);
            // Iterate partials and load.
            args.forEach(function (p) {
                var partial = _this.getPartial(p);
                if (!partial)
                    return;
                template.partials[partial.name] = partial;
            });
        }
    };
    /**
     * Get Dirs
     * Takes a base directory then retrives
     * all sub directories for that directory.
     *
     * @param dir base directory to get all sub directories from.
     */
    Mustr.prototype.getDirs = function (dir) {
        if (!fs_extra_1.existsSync(dir))
            return [];
        return fs_extra_1.readdirSync(dir)
            .filter(function (f) { return fs_extra_1.statSync(path_1.join(dir, f)).isDirectory(); });
    };
    /**
     * Init
     * Initializes Mustr for current project
     *
     * @param force when true forces init.
     */
    Mustr.prototype.init = function (force) {
        var configPath = path_1.resolve(this.cwd, 'mustr.json');
        var blueprintsPath = path_1.resolve(this.cwd, 'mustr');
        // Engine and renderer can only be passed
        // when manually initializing Mustr instance.
        var _defaults = lodash_1.clone(defaults);
        delete _defaults.Engine;
        delete _defaults.renderer;
        // Ensure not already initialized.
        if (!force && (fs_extra_1.existsSync(configPath) || fs_extra_1.existsSync(blueprintsPath)))
            this.log.warn('project already initialized, use mu.init(true) or mu init -f from cli to force.').exit();
        // Write out the mustr.json config.
        fs_extra_1.writeFileSync(configPath, JSON.stringify(_defaults, null, 2));
        // Copy the blueprints.
        fs_extra_1.copySync(path_1.resolve(__dirname, 'blueprints'), blueprintsPath);
        this.log.info('successfully initialized Mustr.');
    };
    /**
     * Load
     * Loads the template paths and config.
     */
    Mustr.prototype.load = function () {
        var _this = this;
        if (this.loaded)
            return this;
        if (!fs_extra_1.existsSync(this.registerPath)) {
            this.log.warn("failed to resolve register configuration at " + this.registerPath + ", need to run \"mu init\"?");
            return this;
        }
        // Load template paths..
        this.templatesGlob = glob.sync(this.templatesPath);
        // Require the config
        var config = this.tryRequire(this.registerPath);
        if (this.options.maxRollbacks > 0)
            this.loadRollbacks();
        if (!lodash_1.isFunction(config)) {
            this.log.error("failed to load config expected function but got type of " + typeof config + ".");
            return this;
        }
        // Auto Register if set
        // call before config.
        if (this.options.autoRegister) {
            this.templatesGlob.forEach(function (k) {
                var parsed = path_1.parse(k);
                _this.register(parsed.name);
            });
        }
        // Call/load the configuration.
        config(this, this.Engine);
        this.loaded = true;
        return this;
    };
    /**
     * Set Engine
     * Allows for setting the templating Engine
     * that should be used for rendering.
     *
     * @param Engine the template Engine used for rendering.
     * @param renderer the rendering method.
     */
    Mustr.prototype.setEngine = function (Engine, renderer) {
        if (!Engine || !renderer)
            return this.log.error('cannot set templating Engine with Engine or renderer of undefined.');
        this.Engine = Engine;
        this.renderer = renderer;
    };
    /**
     * Configure
     * Configures template for output.
     *
     * @param name the name of the template to load.
     * @param output the output name/path to use when rendering.
     * @param options the optional config for the template.
     */
    Mustr.prototype.configure = function (name, output, options) {
        var rendered, ext, outputName, outputPath, groupName;
        var parsedOutput;
        // Enable options as second arg.
        if (lodash_1.isPlainObject(output)) {
            options = output;
            output = undefined;
        }
        // set output to name if undefined.
        if (!lodash_1.isUndefined(name) && lodash_1.isUndefined(output))
            output = name;
        name = name.toLowerCase();
        // Ensure we have a template and an output name.
        if (lodash_1.isUndefined(name) || lodash_1.isUndefined(output))
            this.log.error('cannot generate template using template name or output name of undefined.').exit();
        options = options || {};
        var optsMeta = options.metadata || {};
        delete options.metadata;
        var optsConfig = options;
        var template = this.templates[name];
        // Ensure the template exists.
        if (!template)
            this.log.error("the template " + name + " could not be found.").exit();
        // Check if any partials have been added.
        if (optsConfig.partials)
            this.addPartials(template, optsConfig.partials);
        // Delete partials configured now.
        delete optsConfig.partials;
        // Now merge the options.
        lodash_1.extend(template, optsConfig);
        // If contains path then not static defined
        // we need to read the template file.
        if (template.path)
            template.raw = fs_extra_1.readFileSync(template.path).toString();
        // We need to inspect partials.
        // Since its a partial we just need to
        // read the file.
        var partialKeys = Object.keys(template.partials);
        partialKeys.forEach(function (p) {
            var partial = template.partials[p];
            if (partial.path)
                partial.raw = fs_extra_1.readFileSync(partial.path).toString();
            // Update the partial template.
            template.partials[p] = partial;
        });
        // If we don't have template.raw string to be parsed
        // we can't continue.
        if (lodash_1.isUndefined(template.raw))
            this.log.error('cannot generate template with raw template string of undefined.').exit();
        // Parse the template for body and front matter attributes.
        var fmatter = fm(template.raw);
        var attrs = fmatter.attributes;
        if (attrs.config && !attrs.$config) {
            attrs.$config = attrs.config;
            delete attrs.config;
        }
        var tmpConfig = attrs.$config || {};
        template.metadata = lodash_1.extend({}, fmatter.attributes, template.metadata);
        template.body = fmatter.body;
        // Merge in the parsed config with template config.
        template = lodash_1.extend({}, tmpConfig, template);
        // Allow output dir override.
        // When output path is specified should
        // be relative to the output dir specified
        // or current working directory.
        // otherwise relative to output path.
        template.outputDir = template.outputPath ? template.outputDir || this.cwd : template.outputDir || this.outputPath;
        template.metadata.$component = {};
        // static output path.
        if (template.outputPath) {
            outputPath = path_1.resolve(template.outputDir, template.outputPath);
            template.isAbsolute = true;
            template.outputRelative = path_1.relative(this.cwd, outputPath);
            var parsedOutput_1 = path_1.parse(outputPath);
            // NOTE: don't check for ext could be desired.
            // if (template.ext && !parsedOutput.ext)
            //   this.log.warn('failed to configure template using extension of undefined.');
            template.metadata.$component = {
                name: parsedOutput_1.name,
                fullname: parsedOutput_1.name,
                path: template.outputRelative,
                ext: parsedOutput_1.ext
            };
        }
        else {
            var parsedOutput_2 = path_1.parse(output);
            var staticExt = parsedOutput_2.ext;
            // Build output without ext.
            output = path_1.join(parsedOutput_2.dir, parsedOutput_2.name);
            // Parse the output path/name.
            parsedOutput_2 = path_1.parse(output);
            // Ensure ext from output or defined in template config.
            ext = staticExt || tmpConfig.ext;
            // Get the output name.
            outputName = template.rename ? template.rename : parsedOutput_2.name;
            // Set the component name in metadata.
            template.metadata.$component.name = template.type ? parsedOutput_2.dir : outputName;
            template.metadata.$component.fullname = template.metadata.$component.name;
            // Check component casing and suffix.
            if (template.type) {
                template.metadata.$component.fullname = template.metadata.$component.name + " " + template.type;
                if (template.appendType)
                    outputName += "." + template.type;
            }
            // Ensure full template output path.
            outputPath = path_1.resolve(template.outputDir, parsedOutput_2.dir || '', outputName + ext);
            outputPath = outputPath.toLowerCase();
            template.outputPath = outputPath;
            // Set the relative
            template.outputRelative = path_1.relative(template.outputDir, template.outputPath);
            template.metadata.$component.ext = ext;
            template.metadata.$component.path = template.outputRelative;
        }
        // Update the template object with
        // the output name and output path.
        template.outputPath = outputPath.toLowerCase();
        // Check if casing is specified.
        if (template.casing || template.type) {
            var casing = template.casing ? template.casing : 'title';
            template.metadata.$component.fullname =
                this.transformCase(template.metadata.$component.fullname, casing);
            template.metadata.$component.name =
                this.transformCase(template.metadata.$component.name, casing);
        }
        // Merge parsed options with template metadata.
        // Probably should rework this for now ensure
        // $component isn't overwritten.
        template.metadata = lodash_1.extend({}, template.metadata, optsMeta, { $component: template.metadata.$component });
        return template;
    };
    /**
     * Register
     * Registers a template with Mustr.
     *
     * @param name to use when registering a template.
     * @param template the template name or path to lookup or a static string.
     * @param options the template front matter which overrides static properties.
     */
    Mustr.prototype.register = function (name, template, options) {
        var _this = this;
        var beforeRender, afterRender, partials, methods;
        var addPartials, getPartial;
        var _template;
        if (lodash_1.isPlainObject(template)) {
            options = template;
            template = undefined;
        }
        if (lodash_1.isPlainObject(name)) {
            options = name;
            name = undefined;
            template = undefined;
        }
        // Allow passing only name set as template also.
        if (lodash_1.isString(name)) {
            name = this.normalizeName(name);
            if (lodash_1.isUndefined(template))
                template = name;
        }
        options = options || {};
        name = name || options.name;
        template = template || options.template;
        var tmpPartials = options.partials;
        delete options.partials;
        // Parse the supplied template.
        var parsed = this.normalize(template);
        if (!parsed) {
            this.log.warn("template " + name + " could NOT be normalized registration halted.");
            return;
        }
        name = name.toLowerCase();
        // Merge options.
        lodash_1.extend(parsed, options);
        partials = tmpPartials || parsed.partials;
        beforeRender = parsed.beforeRender;
        afterRender = parsed.afterRender;
        if (this.components[name]) {
            this.log.warn("sorry about that we can't use " + name + " it's already used as a component name.");
            return;
        }
        _template = this.templates[name] = parsed;
        beforeRender = function (before) {
            _template.beforeRender = before;
            return methods;
        };
        afterRender = function (after) {
            _template.afterRender = after;
            return methods;
        };
        // Add partials if needed.
        if (partials)
            this.addPartials(_template, partials);
        // Build up methods for extending registration.
        // It's just cleaner this way rather than a long
        // signature with lots of params for .register().
        // pass Register object if you don't like chaining.
        methods = {
            partials: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                _this.addPartials.apply(_this, [_template].concat(args));
                return methods;
            },
            beforeRender: beforeRender,
            afterRender: afterRender
        };
        return methods;
    };
    /**
     * Register Component
     * Registers a group of templates which will output to the specified
     * directory. Often a component may have several files such as styles
     * helpers, interfaces or maybe actions for react. This makes it easy
     * to output all the files needed at once, hence a "component" or group.
     *
     * @param name the name of the component regsiter.
     * @param args array of template names or csv params.
     */
    Mustr.prototype.registerComponent = function (name) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var options;
        // let series = false;
        var templates;
        if (lodash_1.isPlainObject(name)) {
            options = name;
            name = options.name;
            templates = options.templates || [];
        }
        name = this.normalizeName(name);
        if (!templates)
            templates = args;
        if (!templates.length) {
            this.log.warn('whoops cannot have a component group without any templates!');
            return this;
        }
        // Make sure templates is flatten first
        // element may have all the template names.
        templates = lodash_1.flatten(templates);
        if (this.templates[name]) {
            this.log.warn("sorry about that we can't use " + name + " it's already used as a template name.");
            return this;
        }
        // Ensure templates exist.
        templates = templates.filter(function (t) {
            if (!_this.templates[t])
                _this.log.warn("the template " + t + " has been excluded from component " + name + ", the template could not be found.");
            return _this.templates[t];
        });
        if (!templates || !templates.length) {
            this.log.warn("whoops cannot register component " + name + " without any templates.");
            return this;
        }
        this.components[name] = {
            name: name,
            templates: templates
        };
        return this;
    };
    /**
     * Register Group
     * Just a patch for backward compatibility.
     *
     * @param args arguments for registerComponent.
     */
    Mustr.prototype.registerGroup = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this.registerComponent.apply(this, args);
    };
    /**
     * Render
     * Renders the requested template.
     * @todo this method is a monster now need to break out.
     *
     * @param name the name of the template to render.
     * @param output the output path/name to render the template as.
     * @param options the configuration and metadata object.
     * @param force forces overwriting existing file.
     * @param done Node style callback with err and rendered template.
     * @param group private variable used only internally.
     */
    Mustr.prototype.render = function (name, output, options, force, done, group) {
        var _this = this;
        var template = name;
        var isTemplate, rollbackId, rollbackDir;
        var rollback = {};
        var finished = function (e, t, g) {
            if (e)
                _this.log.error(e);
            else if (!e && t.isStatic && !g)
                _this.log.info("successfully generated static template " + t.outputRelative);
            else if (!e && !g)
                _this.log.info("successfully generated " + t.name + " at " + t.outputRelative + ".");
            else if (!e && g)
                _this.log.info("successfully generated component " + g.name + ".");
            done = done || function () { };
            // If rollbacks enabled save.
            if (_this.options.maxRollbacks > 0)
                _this.saveRollbacks();
            done(e, t);
        };
        if (lodash_1.isString(name)) {
            name = this.normalizeName(name);
        }
        // Check if is component.
        if (lodash_1.isString(name) && this.components[name]) {
            // Groups cannot have extension in output.
            if (lodash_1.isString(output) && /\.[a-zA-Z0-9]{2,5}$/.test(output))
                return this.log.error('component output paths cannot contain extentions.');
            // if (!_isString(output))
            //   return this.log.error('configuration object supported only as third arguemnt for components, use <name> [output] [RegisterConfig].');
            // If a component iterate each template and output.
            var component_1 = this.components[name];
            var ctr_1 = 0;
            var i = component_1.templates.length;
            var groupId = Date.now() + '-' + name;
            var groupObj_1 = {
                id: Date.now(),
                name: name,
                output: output
            };
            output = output || '';
            var splitOut = output.split('/');
            groupObj_1.component = splitOut.pop();
            while (i--) {
                var tpl = component_1.templates[i];
                var opts = lodash_1.clone(options || {});
                var tplOut = void 0;
                if (output)
                    tplOut = path_1.join(output, tpl);
                this.render(tpl, tplOut, opts, null, function (e, t) {
                    ctr_1++;
                    if (ctr_1 === component_1.templates.length)
                        finished(e, t, groupObj_1);
                }, groupObj_1);
            }
        }
        else {
            // Ensure we have some templates loaded.
            if (!Object.keys(this.templates).length)
                return this.log.warn('whoops you no templates registed, add some templates in "register.js"');
            if (lodash_1.isFunction(output)) {
                done = output;
                force = undefined;
                output = undefined;
                options = undefined;
            }
            if (lodash_1.isBoolean(output)) {
                force = output;
                done = options;
                output = undefined;
                options = undefined;
            }
            if (lodash_1.isPlainObject(output)) {
                done = force;
                force = options;
                options = output;
                output = undefined;
            }
            if (lodash_1.isFunction(force)) {
                done = force;
                force = undefined;
            }
            if (lodash_1.isFunction(options)) {
                done = options;
                force = undefined;
                options = undefined;
            }
            if (lodash_1.isBoolean(options)) {
                done = force;
                force = options;
                options = undefined;
            }
            if (lodash_1.isString(template)) {
                // Normalize the template.
                template = this.configure(name, output, options);
            }
            if (lodash_1.isPlainObject(name))
                name = template.name = (template.name || 'none').toLowerCase();
            // If not group generate rollbackId.
            if (!group) {
                rollbackId = Date.now() + '-' + name;
            }
            else {
                rollbackId = group.id + '-' + group.name;
                if (group.component && group.component.length)
                    rollbackId += ('-' + group.component);
            }
            // Ensure force.
            force = force || (options && options.force);
            template.group = template.metadata.$component.group = (group && group.component);
            // Configure rollback.
            rollback.template = name;
            rollbackDir = path_1.join(this.options.configDir, this.rollbacksDir, rollbackId);
            var partials_1 = {};
            // If partials get the raw strings.
            var partialKeys = Object.keys(template.partials);
            partialKeys.forEach(function (p) {
                var partial = template.partials[p];
                partials_1[p] = partial.raw;
            });
            // Ensure before/after render hooks.
            template.beforeRender = template.beforeRender || function (t, d) { d(); };
            template.afterRender = template.afterRender || function (t) { };
            done = done || function (t) { };
            // Ensure injects array.
            template.injects = template.injects || [];
            // Ensure mapped array.
            template.metadata.$component.paths = template.metadata.$component.paths || [];
            // Parse the output path.
            var parsedTemplateOutput_1 = path_1.parse(template.outputPath);
            var parsedOutput = path_1.parse(this.outputPath);
            // Ensure the directory structure exists.
            fs_extra_1.ensureDirSync(parsedTemplateOutput_1.dir);
            var injects_1 = [];
            var success_1 = 0;
            var failed_1 = 0;
            // BUILD MAPPED PATHS
            template.paths = template.paths || [];
            var x = template.paths.length;
            template.paths.forEach(function (itm) {
                itm = itm.replace(/\s+/g, '').split('|');
                if (!itm.length)
                    return;
                var from = itm[0];
                var to = itm[1];
                // Just continue if no from and no to.
                if (!from && !to)
                    return;
                // is to self.
                var fromHasPath = (from === 'self' || lodash_1.isUndefined(from));
                var toHasPath = (to === 'self' || lodash_1.isUndefined(to));
                // Ensure from and to then resolve each.
                from = fromHasPath ? template.outputPath : from;
                to = toHasPath ? template.outputPath : to;
                from = path_1.resolve(_this.outputPath, from);
                to = path_1.resolve(_this.outputPath, to);
                var parsedIns = path_1.parse(from);
                var tmpRel = path_1.relative(parsedIns.dir, to);
                var parsedTmpRel = path_1.parse(tmpRel);
                tmpRel = parsedTmpRel.dir;
                if (parsedTmpRel.name !== 'index')
                    tmpRel = path_1.join(tmpRel, parsedTmpRel.name);
                tmpRel = /^\.\./.test(tmpRel) ? tmpRel : './' + tmpRel;
                template.metadata.$component.paths.push(tmpRel);
            });
            // Iterate the inject
            template.injects.forEach(function (inj) {
                var self = _this;
                var injRollback = {};
                injRollback.template = name;
                if (!Array.isArray(inj.insert))
                    inj.insert = [inj.insert];
                // Check if filename is self.
                if (inj.filename === 'self') {
                    inj.filename = template.outputPath;
                    inj.relative = false;
                }
                var resolvedInject = path_1.resolve(_this.outputPath, inj.filename);
                // Check if inject filename is relative to
                // the output path being generated.
                if (inj.relative) {
                    resolvedInject = path_1.resolve(parsedTemplateOutput_1.dir, inj.filename);
                    inj.filename = path_1.relative(_this.outputPath, resolvedInject);
                }
                // Store the rollback to filename.
                injRollback.rollbackTo = resolvedInject.replace(_this.cwd, '').replace(/^\//, '');
                injRollback.isInject = true;
                // Parse out the injected path
                // we'll need to grab the directory.
                var parsedInject = path_1.parse(resolvedInject);
                if (fs_extra_1.existsSync(resolvedInject)) {
                    var rollbackFrom = path_1.join(rollbackDir, Date.now() + '-' + parsedInject.base);
                    injRollback.rollbackFrom = rollbackFrom;
                    fs_extra_1.copySync(resolvedInject, rollbackFrom);
                }
                var n = inj.insert.length;
                while (n--) {
                    inj.insert[n] = _this.renderer(inj.insert[n], template.metadata);
                }
                var wrapper = function (cb) {
                    _this.inject(inj, function (err) {
                        if (err) {
                            _this.log.warn(err.message);
                            failed_1 += 1;
                        }
                        else {
                            success_1 += 1;
                            // If successful push the rollback
                            _this.addRollback(rollbackId, injRollback);
                        }
                        // callback to continue.
                        cb();
                    });
                };
                injects_1.push(wrapper);
            });
            // Call before render hook.
            template.beforeRender(template, function () {
                var outputName = _this.transformCase(parsedTemplateOutput_1.name, template.filenameCasing || 'lower');
                var outputPath = path_1.join(parsedTemplateOutput_1.dir, outputName + parsedTemplateOutput_1.ext);
                // Render the template.
                template.rendered = _this.renderer(template.body, template.metadata, partials_1);
                // Store the rollback to path.
                rollback.rollbackTo = outputPath.replace(_this.cwd, '').replace(/^\//, '');
                // Don't write to file.
                if (template.noOutput) {
                    template.afterRender(template);
                    finished(null, template);
                }
                else {
                    if (fs_extra_1.existsSync(outputPath)) {
                        if (force !== true)
                            return _this.log.warn("cannot generate the file " + template.outputRelative + " exists, use -f from cli or pass force in render overwrite.");
                        // If exists then we'll need to copy existing for rollback.
                        var rollbackFrom = path_1.join(rollbackDir, Date.now() + '-' + outputName + parsedTemplateOutput_1.ext);
                        rollback.rollbackFrom = rollbackFrom;
                        fs_extra_1.copySync(outputPath, rollbackFrom);
                    }
                    // Write the file.
                    fs_extra_1.writeFile(outputPath, template.rendered, function (err) {
                        if (!err)
                            _this.addRollback(rollbackId, rollback);
                        if (err) {
                            finished(err);
                        }
                        else if (!injects_1.length) {
                            // Call after render.
                            template.afterRender(template);
                            // Render may be called directly with done callback.
                            finished(null, template);
                        }
                        else {
                            // Iterate injects.
                            async_1.series(injects_1, function (err, results) {
                                if (success_1 === 0 && failed_1 > 0)
                                    _this.log.error(success_1 + " successfully injected " + failed_1 + " failed.");
                                else if (failed_1 > success_1)
                                    _this.log.warn(success_1 + " successfully injected " + failed_1 + " failed.");
                                else
                                    _this.log.info(success_1 + " successfully injected " + failed_1 + " failed.");
                                // Call done/after callbacks.
                                template.afterRender(template);
                                finished(null, template);
                            });
                        }
                    });
                }
            });
        }
    };
    /**
     * Inject
     * Creates a file stream reading chunks until match.
     * Upon match the provided value is injected.
     * NOTE: lines are auto updated with the correct
     * line ending for returns.
     *
     * @param filename the file name to inject into.
     * @param find the string or expression to match.
     * @param insert the value or callback for injecting upon match.
     * @param strategy insert on before, after, replace, first or last when matched.
     * @param done the callback on file written.
     */
    Mustr.prototype.inject = function (filename, find, strategy, insert, done) {
        var _this = this;
        var data = [];
        var idx = 0;
        var matches = 0;
        var insertLen = 0;
        var lastMatch = 0;
        var exp;
        // Allows done callback as second arg.
        if (lodash_1.isFunction(find))
            done = find;
        if (lodash_1.isPlainObject(filename)) {
            var obj = filename;
            filename = obj.filename;
            find = obj.find;
            insert = obj.insert;
            strategy = obj.strategy;
            done = obj.done || done;
        }
        strategy = strategy || 'after';
        done = done || function () { };
        // Inserts at a given index.
        function insertAt(arr, index, item) {
            var start = arr.slice(0, index);
            var end = arr.slice(index);
            return [].concat(start).concat(item).concat(end);
        }
        // Sets indentation for inserts.
        function setIndent(from, to) {
            var indent = di(from).indent;
            to.forEach(function (t, i) {
                to[i] = (indent + t);
            });
            return to;
        }
        // Resolve the filename.
        filename = path_1.resolve(this.outputPath, filename);
        if (!fs_extra_1.existsSync(filename))
            return done(new Error("failed to inject in " + path_1.relative(this.outputPath, filename) + ", file not found."));
        exp = find;
        // If is string convert to expression.
        if (lodash_1.isString(exp))
            exp = new RegExp(exp);
        // Normalize the insert
        if (lodash_1.isString(insert))
            insert = [insert];
        insert = insert || [];
        insertLen = insert.length;
        var rl = readline.createInterface({
            input: fs_extra_1.createReadStream(filename)
        });
        rl.on('line', function (line) {
            if (exp.test(line)) {
                matches += 1;
                if (strategy !== 'last')
                    insert = setIndent(line, insert);
                if (strategy === 'before') {
                    data = data.concat(insert);
                    data.push(line);
                    idx += insertLen;
                }
                else if (strategy === 'after') {
                    data.push(line);
                    data = data.concat(insert);
                    idx += insertLen;
                }
                else if (strategy === 'replace') {
                    data = data.concat(insert);
                    idx += (insertLen - 1);
                }
                else if (strategy === 'first' && matches === 1) {
                    data = data.concat(insert);
                    data.push(line);
                    idx += insertLen;
                }
                else {
                    data.push(line);
                }
            }
            else {
                data.push(line);
            }
            // keep track of our index.
            idx += 1;
            if (exp.test(line))
                lastMatch = idx;
        });
        rl.on('close', function () {
            if (strategy === 'last' && matches > 0 && lastMatch >= 0) {
                insert = setIndent(data[lastMatch - 1], insert);
                data = insertAt(data, lastMatch, insert);
            }
            var joined = data.join(os_1.EOL);
            fs_extra_1.writeFile(filename, joined, function (err) {
                var insertStr = insert.join(', ');
                if (err)
                    _this.log.warn(err);
                else
                    _this.log.info("injected: " + _this.truncate(insert, 18) + " in: " + path_1.parse(filename).base + ".");
                // Pass error back for render counter.
                // does not count when manually calling
                // .inject method.
                done(err);
            });
        });
    };
    /**
  <<<<<<< HEAD
     * Add Rollback
     * Adds a rollback to the collection.
     *
     * @param id the id of the rollback to add.
     * @param rollback the rollback object.
     */
    Mustr.prototype.addRollback = function (id, rollback) {
        if (this.options.maxRollbacks === 0)
            return;
        // Ensure id doesn't contain dots.
        id = id.replace(/\./g, '-');
        var rb = this.rollbacks[id] = this.rollbacks[id] || {};
        if (!rb.timestamp)
            rb.timestamp = (new Date()).toISOString();
        rb.rollbacks = rb.rollbacks || [];
        rb.rollbacks.push(rollback);
        return rollback;
    };
    /**
  =======
  >>>>>>> e84e5d6fa7349a3ef659cf87d77e5a743065516b
     * Rollback
     * Rolls back and removes generated templates.
     *
     * NOTE: currently does not rollback injects.
     *
     * @param name the template or group name.
     */
    Mustr.prototype.rollback = function (name, output) {
        var _this = this;
        var template;
        var templates = [];
        var isGroup;
        var failed = 0;
        var success = 0;
        // Check if is rollback id.
        var isRollbackId = this.rollbackIdExp.test(name);
        // Check if no id, if true get last.
        if (lodash_1.isUndefined(name)) {
            name = lodash_1.keys(this.rollbacks).sort().pop();
            isRollbackId = true;
        }
        var finish = function () {
            // If a rollback id we need to
            // remove from from rollbacks.json
            // and any associated rollback files.
            if (isRollbackId)
                _this.removeRollbacks(name);
            if (isGroup)
                if (failed > success)
                    _this.log.error("rolled back " + name + " " + success + " successful with " + failed + " failing.");
                else
                    _this.log.info("rolled back " + name + " " + success + " successful with " + failed + " failing.");
            else if (failed === 0)
                _this.log.info("successfully rolled back " + name + " at " + templates[0].outputRelative + ".");
            else
                _this.log.error("failed to roll back " + templates[0].name + " at " + templates[0].outputRelative + ".");
            console.log();
        };
        // Rolling back from known rollback.
        if (isRollbackId) {
            // Rollbacks by id are always groups.
            isGroup = true;
            // Get the rollback.
            var rb = this.rollbacks[name];
            if (!rb) {
                this.log.error('cannot rollback using rollback instance of undefined.');
                return this;
            }
            var i = rb.rollbacks.length;
            while (i--) {
                var rollback = rb.rollbacks[i];
                var to = path_1.resolve(this.cwd, rollback.rollbackTo);
                // If from copy from backed up file.
                if (rollback.rollbackFrom) {
                    var from = path_1.resolve(this.cwd, rollback.rollbackFrom);
                    try {
                        fs_extra_1.copySync(from, to);
                        success++;
                    }
                    catch (ex) {
                        this.log.warn("failed to rollback from " + rollback.rollbackFrom + " to " + rollback.rollbackTo + ".");
                        failed++;
                    }
                }
                else {
                    try {
                        fs_extra_1.removeSync(to);
                        success++;
                    }
                    catch (ex) {
                        this.log.warn("failed to remove " + rollback.rollbackTo + ".");
                        failed++;
                    }
                }
            }
            finish();
        }
        else {
            name = name.toLowerCase().replace(this.tplexp, '');
            // Check if name is a component of templates.
            if (this.components[name]) {
                var comps = this.components[name];
                isGroup = true;
                var i_1 = comps.templates.length;
                while (i_1--) {
                    var tpl = comps.templates[i_1];
                    templates.push(this.configure(comps.templates[i_1], path_1.join(output, tpl)));
                }
            }
            else {
                templates.push(this.configure(name, output));
            }
            // Iterate templates and remove.
            var i = templates.length;
            while (i--) {
                var t = templates[i];
                try {
                    fs_extra_1.removeSync(t.outputPath);
                    if (isGroup)
                        this.log.info("successfully removed " + t.name + " at " + t.outputRelative + ".");
                    success++;
                }
                catch (ex) {
                    this.log.warn("could not remove generated template using path " + t.outputRelative);
                    failed++;
                }
            }
            finish();
        }
        return this;
    };
    /**
     * Remove Rollbacks
     * Removes previous rollbacks before Date
     * by Date string a count of rollbacks to
     * be removed or by rollbackId. When a number
     * is provided the first of number provided
     * will be removed. The last rollback is
     * always preserved.
     *
     * @param by the date string or number of rollbacks to remove.
     * @param save when false changes are not saved to file.
     */
    Mustr.prototype.removeRollbacks = function (by, save) {
        var _this = this;
        var date;
        var count = 0;
        var rollbackId;
        // Internal helper removes by key
        // checks if rollbacks folder exists
        // if yes unlinks/deletes it.
        var removeByKey = function (key) {
            // Delete from collection.
            delete _this.rollbacks[key];
            // If folder exists remove rollbacks folder.
            var rollbackPath = path_1.join(_this.options.configDir, _this.rollbacksDir, key);
            // If path exists remove.
            if (fs_extra_1.existsSync(rollbackPath))
                fs_extra_1.removeSync(rollbackPath);
            // Check if should save rollback changes.
            if (save !== false)
                _this.saveRollbacks();
        };
        // Check if is rollback id or
        // string to be converted to date.
        if (lodash_1.isString(by)) {
            if (this.rollbackIdExp.test(by))
                rollbackId = by;
            else
                date = new Date(by);
        }
        else if (lodash_1.isNumber(by))
            count = by;
        else if (by instanceof Date)
            date = by;
        else
            this.log.error("unsupported typeof " + typeof by + " detected.");
        var keys = lodash_1.keys(this.rollbacks).sort();
        // Ensure count is no more than one
        // less than the lenght of keys.
        if (count >= keys.length)
            count = keys.length - 1;
        // Delete by id.
        if (rollbackId) {
            removeByKey(rollbackId);
        }
        else if (count > 0) {
            var ctr = 0;
            while (ctr < count) {
                var key = keys[ctr];
                removeByKey(key);
                ctr++;
            }
        }
        else if (date) {
            var filterDate_1 = date.getTime();
            keys.forEach(function (k, i) {
                if ((i + 1) >= keys.length)
                    return;
                var ts = Number(k.split('-')[0]);
                if (ts < filterDate_1) {
                    removeByKey(k);
                }
            });
        }
        else {
            this.log.warn("0 rollbacks removed, unsupported type " + typeof by + " or no unmatched criteria.");
        }
        return this;
    };
    /**
     * Reindex Rollbacks
     * Iterates rollbacks.json re-sorts order
     * optionally prunes records where rollback
     * files are missing.
     *
     * @param prune when true prunes entries where missing required rollback folder/files.
     */
    Mustr.prototype.reindexRollbacks = function (prune) {
        var _this = this;
        var keys = lodash_1.keys(this.rollbacks).sort();
        var dirs = this.getDirs(path_1.resolve(this.options.configDir, this.rollbacksDir));
        var tmp = {};
        // If directories ensure matching
        // keys in rollbacks.json.
        if (prune !== false) {
            dirs.forEach(function (d) {
                // If key doesn't exist remove dir.
                if (keys.indexOf(d) === -1)
                    fs_extra_1.removeSync(path_1.resolve(_this.options.configDir, _this.rollbacksDir, d));
            });
        }
        // Iterate keys and ensure rollbacks
        // contain value paths etc.
        keys.forEach(function (k) {
            var rb = _this.rollbacks[k];
            var i = rb.rollbacks.length;
            // Check if should prune.
            if (prune !== false) {
                while (i--) {
                    var r = rb.rollbacks[i];
                    if (r.rollbackFrom && !fs_extra_1.existsSync(r.rollbackFrom))
                        delete rb.rollbacks[i];
                }
                // If we still have rollbacks then add
                // to the temp object.
                if (rb.rollbacks && rb.rollbacks.length)
                    tmp[k] = rb;
            }
            else {
                tmp[k] = rb;
            }
        });
        // Update to reindex object.
        this.rollbacks = tmp;
        return this;
    };
    /**
     * Load Rollbacks
     * Loads the rollbacks config file.
     */
    Mustr.prototype.loadRollbacks = function (reindex) {
        this.rollbacks = this.tryRequire(this.rollbacksPath);
        if (reindex)
            this.reindexRollbacks();
        return this;
    };
    /**
     * Show Rollbacks
     * Shows details/stats for recoreded rollbacks.
     *
     * @param display when false will NOT display stats in console.
     */
    Mustr.prototype.getRollbacks = function () {
        var obj = this.rollbacks;
        var result = {};
        var keys = Object.keys(this.rollbacks).sort();
        var i = keys.length;
        while (i--) {
            var id = keys[i];
            var rb = this.rollbacks[id];
            var tmp = {};
            tmp.id = id;
            tmp.timestamp = rb.timestamp;
            tmp.count = rb.rollbacks.length;
            tmp.templates = rb.rollbacks.map(function (r) { return r.template; });
            result[id] = tmp;
        }
        return result;
    };
    /**
     * Save Rollbacks
     * Writes current rollbacks to file.
     *
     * @param prune when false prevents pruning rollbacks before save.
     */
    Mustr.prototype.saveRollbacks = function (prune) {
        var keys = lodash_1.keys(this.rollbacks).sort();
        var removeCount = this.options.maxRollbacks === 0 ? 0 : keys.length - this.options.maxRollbacks;
        // Check if should prune previous
        // rollbacks.
        if (removeCount > 0 && prune !== false)
            return this.removeRollbacks(removeCount);
        fs_extra_1.writeFileSync(this.rollbacksPath, JSON.stringify(this.rollbacks, null, 2));
        return this;
    };
    /**
     * Transform To
     * Transforms a string to the desired casing.
     *
     * @param str the string to be transformed.
     * @param to the casing to be transformed to using lodash.
     */
    Mustr.prototype.transformCase = function (str, to) {
        var caseMap = {
            lower: lodash_1.lowerCase,
            upper: lodash_1.upperCase,
            capitalize: lodash_1.capitalize,
            camel: lodash_1.camelCase,
            lowerCase: lodash_1.lowerCase,
            upperCase: lodash_1.upperCase,
            camelCase: lodash_1.camelCase,
            title: function (str) {
                return lodash_1.startCase(lodash_1.toLower(str));
            }
        };
        var validTypes = lodash_1.keys(caseMap);
        caseMap.titleCase = caseMap.title;
        to = to.trim();
        if (lodash_1.isUndefined(caseMap[to])) {
            this.log.warn("invalid transform case " + to + " (" + chalk.cyan(validTypes.join(', ')) + ").");
            return str;
        }
        var splitStr = str.split('.');
        splitStr = splitStr.map(function (s) {
            return caseMap[to](s).replace(/\s/g, '');
        });
        return splitStr.join('.');
    };
    return Mustr;
}(events_1.EventEmitter));
exports.Mustr = Mustr;
//# sourceMappingURL=index.js.map