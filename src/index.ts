
import { readFile, readFileSync, writeFileSync, writeFile, existsSync, copySync, ensureDirSync, createReadStream, removeSync, readdirSync, statSync } from 'fs-extra';
import * as readline from 'readline';
import { join, resolve, parse, ParsedPath, relative, sep } from 'path';
import { logger, ILogger, Chalk } from 'pargv';
import { EOL } from 'os';
import * as glob from 'glob';
import * as di from 'detect-indent';
import { parallel, series } from 'async';
import {
  extend as _extend, get as _get,
  set as _set, unset as _unset,
  isUndefined as _isUndefined,
  isPlainObject as _isPlainObject,
  isFunction as _isFunction,
  isBoolean as _isBoolean,
  isString as _isString,
  camelCase as _camelCase,
  lowerCase as _lowerCase,
  upperCase as _upperCase,
  startCase as _startCase,
  capitalize as _capitalize,
  toLower as _toLower,
  flatten as _flatten,
  clone as _clone,
  isNumber as _isNumber,
  keys as _keys
} from 'lodash';

import { EventEmitter } from 'events';
import * as fm from 'front-matter';
import * as Mustache from 'mustache';
import { IMustr, IMustrOptions, ITemplate, BeforeRender, IMetadata, InjectCallback, NodeCallback, AfterRender, IRegister, IRegisterConfig, IInject, IComponent, IConfig, RenderMethod, IRollback, IRollbackContainer, IRollbackStat, IMap } from './interfaces';

const chalk = new Chalk();

const defaults: IMustrOptions = {
  configDir: './mustr',             // when your config directory exists.
  outputDir: './src',               // the default output dir for generated files.
  templateExt: '.tpl',              // the extension name for templates.
  autoLoad: true,                   // auto loads conf, set to false for manual ctrl.
  autoRegister: true,               // whether templates in config dir should auto reg.
  Engine: undefined,                // optional Compiler Engine (default: Mustache).
  renderer: undefined,              // optional Compiler renderer method.
  maxRollbacks: 15                  // max rollbacks to store set to 0 to disable.
};

export class Mustr extends EventEmitter implements IMustr {

  private tplexp: RegExp;
  private loaded: boolean = false;
  private rollbacksDir: string = 'rollbacks';

  rollbackIdExp: RegExp = /^[0-9]+-[a-z0-9]+(-[a-z0-9]+)?$/;

  // Engine
  Engine: Object;
  renderer: RenderMethod;

  // Utils
  cwd: string = process.cwd().toLowerCase();
  log: ILogger;

  // Paths
  configPath: string;
  registerPath: string;
  templatesPath: string;
  outputPath: string;
  rollbacksPath: string;

  // Array of template paths.
  templatesGlob: string[];

  // Parsed templates.
  templates: IMap<ITemplate> = {};
  components: IMap<IComponent> = {};
  rollbacks: IMap<IRollbackContainer> = {};

  // Options
  options: IMustrOptions;

  constructor(options?: IMustrOptions) {

    super();

    this.options = _extend({}, defaults, options);

    this.log = logger();

    this.configPath = resolve(this.cwd, this.options.configDir);

    this.templatesPath = resolve(this.cwd, join(this.options.configDir, '/**/*.tpl')).toLowerCase();

    // Resolve the base directory.
    this.outputPath = resolve(this.cwd, this.options.outputDir).toLowerCase();

    // Resolve the config path.
    this.registerPath = resolve(this.cwd, this.options.configDir, 'register.js').toLowerCase();

    // Normalized the template extension.
    this.options.templateExt = this.normalizedExt(this.options.templateExt);

    // Path to rollbacks register.
    this.rollbacksPath = resolve(this.cwd, join(this.options.configDir, 'rollbacks.json'));

    this.tplexp = new RegExp(this.options.templateExt + '$');

    this.Engine = this.options.Engine || Mustache;

    this.renderer = this.options.renderer || Mustache.render;

    this.load();

  }

  /**
   * Has Matter
   * Tests if string contains front matter.
   *
   * @param str the string to inspect.
   */
  private hasMatter(str): boolean {
    return str.indexOf('---') > -1;
  }

  /**
   * Has Template
   * Loosly check if string contains template chars.
   *
   * @param str the string to inspect.
   */
  private hasTemplate(str): boolean {
    return str.indexOf('{{') > -1;
  }

  /**
   * Try Require
   * Tries to require a module logging error if failed.
   *
   * @param path the module path to be required.
   */
  private tryRequire(path: string) {
    try {
      return require(path);
    }
    catch (ex) {
      this.log.error(`failed to require module at ${path}.`).exit();
    }
  }

  /**
   * Normalize Extension
   * Ensures extension begins with "."
   *
   * @param ext the extension to be normalized.
   */
  private normalizedExt(ext): string {
    return `.${ext.replace(/^\./, '')}`;
  }

  /**
   * Normalize
   * Parses/normalizes a template name, path or static template string.
   * When passing a name it searches loaded template paths and matches
   * the filename to the template name passed.
   *
   * @param template the template name, path or static template string.
   */
  private normalize(template: string): ITemplate {

    let rawTemplate, templatePath, templatePathNormalized,
      templateName, templateExt;
    const EXT_EXP = new RegExp(`${this.options.templateExt}$`);

    let parsedPath, parsedNormalized, isStatic;

    // When has extension readfile.
    if (EXT_EXP.test(template)) {

      // Static paths should resolve from working directory.
      template = resolve(this.cwd, template);

      // If template doesn't exist error & exit.
      if (!existsSync(template))
        this.log.error(`failed to resolve static template at path ${template}. Exclude '.tpl from template name to reference loaded template.`).exit();

      // Save the template path.
      templatePath = template;

    }

    // If not a static template try to
    // lookup from loaded template paths and read.
    else if (!this.hasMatter(template) && !this.hasTemplate(template)) {

      const filtered = this.templatesGlob.filter((t) => {
        return parse(t).name === template;
      })[0];

      if (!filtered) {
        this.log.error(`failed to resolve template for name ${template}.`);
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
      parsedPath = parse(templatePath);
      parsedNormalized = parse(templatePathNormalized);

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

    // Otherwise this is a static template
    // set raw to be parsed later.
    else {
      rawTemplate = template;
      isStatic = true;
    }

    // Get the template's configuration.
    const config: ITemplate = {
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

  }

  /**
   * Normalize Name
   * Removes extention from template name.
   *
   * @param name the template name to normalize.
   */
  private normalizeName(name: any): any {
    if (!_isString(name))
      return name;
    return name.toLowerCase().replace(this.tplexp, '').replace(/^\.?\/?/, '');
  }

  /**
   * Truncate
   * Nothing special, cheesy truncation...move along.
   *
   * @param str the string to be truncated.
   * @param max the max len before truncating.
   */
  private truncate(str, max): string {
    return str.length > max ? str.substr(0, max - 1) + '...' : str;
  }

  /**
   * Get Partial
   *
   * @param partial the partial to get.
   */
  private getPartial(partial: any): ITemplate {

    const partialName = partial.toLowerCase();
    const existing = this.templates[partialName];

    if (existing) return existing;

    partial = this.normalize(partial);

    if (!partial) {
      this.log.warn(`the partial ${partialName} could not be normalized.`);
      return;
    }

    partial.isPartial = true;

    return partial;

  }

  /**
   * Add Partials
   *
   * @param template the template to add partials to.
   * @param args the list of partials to add.
   */
  private addPartials(template: ITemplate, ...args: any[]): void {

    if (!args.length)
      return;

    if (_isPlainObject(args[0])) {

      const _partials = args[0];

      Object.keys(_partials).forEach((p) => {

        const partial = this.getPartial(_partials[p]);
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
      args.forEach((p) => {

        const partial = this.getPartial(p);
        if (!partial)
          return;
        template.partials[partial.name] = partial;

      });

    }

  }

  /**
   * Add Rollback
   * Adds a rollback to the collection.
   *
   * @param id the id of the rollback to add.
   * @param rollback the rollback object.
   */
  private addRollback(id: string, rollback: IRollback): IRollbackContainer {

    if (this.options.maxRollbacks === 0)
      return;

    const rb = this.rollbacks[id] = this.rollbacks[id] || {};

    if (!rb.timestamp)
      rb.timestamp = (new Date()).toISOString();
    rb.rollbacks = rb.rollbacks || [];

    rb.rollbacks.push(rollback);

    return rollback;

  }

  /**
   * Get Dirs
   * Takes a base directory then retrives
   * all sub directories for that directory.
   *
   * @param dir base directory to get all sub directories from.
   */
  private getDirs(dir: string): string[] {
    if (!existsSync(dir))
      return [];
    return readdirSync(dir)
      .filter(f => statSync(join(dir, f)).isDirectory());
  }

  /**
   * Init
   * Initializes Mustr for current project
   *
   * @param force when true forces init.
   */
  init(force?: boolean): void {

    const configPath = resolve(this.cwd, 'mustr.json');
    const blueprintsPath = resolve(this.cwd, 'mustr');

    // Engine and renderer can only be passed
    // when manually initializing Mustr instance.
    const _defaults = _clone(defaults);
    delete _defaults.Engine;
    delete _defaults.renderer;

    // Ensure not already initialized.
    if (!force && (existsSync(configPath) || existsSync(blueprintsPath)))
      this.log.warn('project already initialized, use mu.init(true) or mu init -f from cli to force.').exit();

    // Write out the mustr.json config.
    writeFileSync(configPath, JSON.stringify(_defaults, null, 2));

    // Copy the blueprints.
    copySync(resolve(__dirname, 'blueprints'), blueprintsPath);

    this.log.info('successfully initialized Mustr.');

  }

  /**
   * Load
   * Loads the template paths and config.
   */
  load(): IMustr {

    if (this.loaded)
      return this;

    if (!existsSync(this.registerPath)) {
      this.log.warn(`failed to resolve register configuration at ${this.registerPath}, need to run "mu init"?`);
      return this;
    }

    // Load template paths..
    this.templatesGlob = glob.sync(this.templatesPath);

    // Require the config
    const config = this.tryRequire(this.registerPath);

    if (this.options.maxRollbacks > 0)
      this.loadRollbacks();

    if (!_isFunction(config)) {
      this.log.error(`failed to load config expected function but got type of ${typeof config}.`);
      return this;
    }

    // Auto Register if set
    // call before config.
    if (this.options.autoRegister) {
      this.templatesGlob.forEach((k) => {
        const parsed = parse(k);
        this.register(parsed.name);
      });
    }

    // Call/load the configuration.
    config(this, this.Engine);

    this.loaded = true;

    return this;

  }

  /**
   * Set Engine
   * Allows for setting the templating Engine
   * that should be used for rendering.
   *
   * @param Engine the template Engine used for rendering.
   * @param renderer the rendering method.
   */
  setEngine(Engine: Object, renderer: RenderMethod) {
    if (!Engine || !renderer)
      return this.log.error('cannot set templating Engine with Engine or renderer of undefined.');
    this.Engine = Engine;
    this.renderer = renderer;
  }

  /**
   * Configure
   * Configures template for output.
   *
   * @param name the name of the template to load.
   * @param output the output name/path to use when rendering.
   * @param options the optional config for the template.
   */
  configure(name: string, output?: string | IRegisterConfig, options?: IRegisterConfig): ITemplate {

    let rendered, ext, outputName, outputPath, groupName;
    let parsedOutput: ParsedPath;

    // Enable options as second arg.
    if (_isPlainObject(output)) {
      options = <IRegisterConfig>output;
      output = undefined;
    }

    // set output to name if undefined.
    if (!_isUndefined(name) && _isUndefined(output))
      output = name;

    name = name.toLowerCase();

    // Ensure we have a template and an output name.
    if (_isUndefined(name) || _isUndefined(output))
      this.log.error('cannot generate template using template name or output name of undefined.').exit();

    options = options || {};
    let optsMeta = options.metadata || {};
    delete options.metadata;
    let optsConfig = options;

    let template: ITemplate = this.templates[name];

    // Ensure the template exists.
    if (!template)
      this.log.error(`the template ${name} could not be found.`).exit();

    // Check if any partials have been added.
    if (optsConfig.partials)
      this.addPartials(template, optsConfig.partials);

    // Delete partials configured now.
    delete optsConfig.partials;

    // Now merge the options.
    _extend(template, optsConfig);

    // If contains path then not static defined
    // we need to read the template file.
    if (template.path)
      template.raw = readFileSync(template.path).toString();

    // We need to inspect partials.
    // Since its a partial we just need to
    // read the file.
    const partialKeys = Object.keys(template.partials);
    partialKeys.forEach((p) => {

      const partial: ITemplate = template.partials[p];

      if (partial.path)
        partial.raw = readFileSync(partial.path).toString();

      // Update the partial template.
      template.partials[p] = partial;

    });

    // If we don't have template.raw string to be parsed
    // we can't continue.
    if (_isUndefined(template.raw))
      this.log.error('cannot generate template with raw template string of undefined.').exit();

    // Parse the template for body and front matter attributes.
    const fmatter = fm(template.raw);
    const attrs = fmatter.attributes;
    if (attrs.config && !attrs.$config) {
      attrs.$config = attrs.config;
      delete attrs.config;
    }
    const tmpConfig = attrs.$config || {};

    template.metadata = _extend({}, fmatter.attributes, template.metadata);
    template.body = fmatter.body;

    // Merge in the parsed config with template config.
    template = _extend({}, tmpConfig, template);

    // Allow output dir override.
    // When output path is specified should
    // be relative to the output dir specified
    // or current working directory.
    // otherwise relative to output path.
    template.outputDir = template.outputPath ? template.outputDir || this.cwd : template.outputDir || this.outputPath;

    template.metadata.$component = {};

    // static output path.
    if (template.outputPath) {

      outputPath = resolve(template.outputDir, template.outputPath);
      template.isAbsolute = true;
      template.outputRelative = relative(this.cwd, outputPath);

      let parsedOutput = parse(outputPath);

      // NOTE: don't check for ext could be desired.
      // if (template.ext && !parsedOutput.ext)
      //   this.log.warn('failed to configure template using extension of undefined.');

      template.metadata.$component = {
        name: parsedOutput.name,
        fullname: parsedOutput.name,
        path: template.outputRelative,
        ext: parsedOutput.ext
      };
    }

    else {

      let parsedOutput = parse(<string>output);
      let staticExt = parsedOutput.ext;

      // Build output without ext.
      output = join(parsedOutput.dir, parsedOutput.name);

      // Parse the output path/name.
      parsedOutput = parse(output as string);

      // Ensure ext from output or defined in template config.
      ext = staticExt || tmpConfig.ext;

      // Get the output name.
      outputName = template.rename ? template.rename : parsedOutput.name;

      // Set the component name in metadata.
      template.metadata.$component.name = template.type ? parsedOutput.dir : outputName;
      template.metadata.$component.fullname = template.metadata.$component.name;

      // Check component casing and suffix.
      if (template.type) {
        template.metadata.$component.fullname = `${template.metadata.$component.name} ${template.type}`;
        if (template.appendType)
          outputName += `.${template.type}`;
      }

      // Ensure full template output path.
      outputPath = resolve(template.outputDir, parsedOutput.dir || '', outputName + ext);
      outputPath = outputPath.toLowerCase();

      template.outputPath = outputPath;

      // Set the relative
      template.outputRelative = relative(template.outputDir, template.outputPath);

      template.metadata.$component.ext = ext;
      template.metadata.$component.path = template.outputRelative;

    }

    // Update the template object with
    // the output name and output path.
    template.outputPath = outputPath.toLowerCase();

    // Check if casing is specified.
    if (template.casing || template.type) {
      const casing = template.casing ? template.casing : 'title';
      template.metadata.$component.fullname =
        this.transformCase(template.metadata.$component.fullname, casing);
      template.metadata.$component.name =
        this.transformCase(template.metadata.$component.name, casing);
    }

    // Merge parsed options with template metadata.
    // Probably should rework this for now ensure
    // $component isn't overwritten.
    template.metadata = _extend({}, template.metadata, optsMeta, { $component: template.metadata.$component });

    return template;

  }

  /**
   * Register
   * Registers a template with Mustr.
   *
   * @param name to use when registering a template.
   * @param template the template name or path to lookup or a static string.
   * @param options the template front matter which overrides static properties.
   */
  register(name: string | IRegisterConfig, template?: string | IRegisterConfig, options?: IRegisterConfig): IRegister {


    let beforeRender, afterRender, partials, methods;
    let addPartials, getPartial;
    let _template: ITemplate;

    if (_isPlainObject(template)) {
      options = <IRegisterConfig>template;
      template = undefined;
    }

    if (_isPlainObject(name)) {
      options = <IRegisterConfig>name;
      name = undefined;
      template = undefined;
    }

    // Allow passing only name set as template also.
    if (_isString(name)) {
      name = this.normalizeName(name);
      if (_isUndefined(template))
        template = name;
    }

    options = options || {};
    name = name || options.name;
    template = template || options.template;

    let tmpPartials = options.partials;
    delete options.partials;

    // Parse the supplied template.
    const parsed = this.normalize(<string>template);

    if (!parsed) {
      this.log.warn(`template ${name} could NOT be normalized registration halted.`);
      return;
    }

    name = (name as string).toLowerCase();

    // Merge options.
    _extend(parsed, options);

    partials = tmpPartials || parsed.partials;
    beforeRender = parsed.beforeRender;
    afterRender = parsed.afterRender;

    if (this.components[name as string]) {
      this.log.warn(`sorry about that we can\'t use ${name} it\'s already used as a component name.`);
      return;
    }

    _template = this.templates[<string>name] = parsed;

    beforeRender = (before: BeforeRender) => {
      _template.beforeRender = before;
      return methods;
    };

    afterRender = (after: AfterRender) => {
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
      partials: (...args: any[]) => {
        this.addPartials(_template, ...args);
        return methods;
      },
      beforeRender,
      afterRender
    };

    return methods;

  }

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
  registerComponent(name: string | IComponent, ...args: any[]): IMustr {

    let options: IComponent;
    // let series = false;
    let templates: any;

    if (_isPlainObject(name)) {
      options = <IComponent>name;
      name = options.name;
      templates = options.templates || [];
    }

    name = <string>this.normalizeName(name);

    if (!templates)
      templates = args;

    if (!templates.length) {
      this.log.warn('whoops cannot have a component group without any templates!');
      return this;
    }

    // Make sure templates is flatten first
    // element may have all the template names.
    templates = _flatten(templates);

    if (this.templates[name as string]) {
      this.log.warn(`sorry about that we can\'t use ${name} it\'s already used as a template name.`);
      return this;
    }

    // Ensure templates exist.
    templates = templates.filter((t) => {
      if (!this.templates[t])
        this.log.warn(`the template ${t} has been excluded from component ${name}, the template could not be found.`);
      return this.templates[t];
    });

    if (!templates || !templates.length) {
      this.log.warn(`whoops cannot register component ${name} without any templates.`);
      return this;
    }

    this.components[name] = {
      name: name,
      templates: templates
    };

    return this;

  }

  /**
   * Register Group
   * Just a patch for backward compatibility.
   *
   * @param args arguments for registerComponent.
   */
  registerGroup(...args: any[]): IMustr {
    return this.registerComponent.apply(this, args);
  }

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
  render(name: string | ITemplate, output?: string | IRegisterConfig | NodeCallback | boolean, options?: IRegisterConfig | NodeCallback | boolean, force?: boolean | NodeCallback, done?: NodeCallback, group?: any) {

    let template = <ITemplate>name;
    let isTemplate, rollbackId, rollbackDir;
    const rollback: IRollback = {};

    const finished = (e, t?, g?) => {

      if (e)
        this.log.error(e);

      else if (!e && t.isStatic && !g)
        this.log.info(`successfully generated static template ${t.outputRelative}`);

      else if (!e && !g)
        this.log.info(`successfully generated ${t.name} at ${t.outputRelative}.`);

      else if (!e && g)
        this.log.info(`successfully generated component ${g.name}.`);

      done = done || function () { };

      // If rollbacks enabled save.
      if (this.options.maxRollbacks > 0)
        this.saveRollbacks();

      done(e, t);

    };

    if (_isString(name)) {
      name = <string>this.normalizeName(name);
    }

    // Check if is component.
    if (_isString(name) && this.components[name]) {

      // Groups cannot have extension in output.
      if (_isString(output) && /\.[a-zA-Z0-9]{2,5}$/.test(output))
        return this.log.error('component output paths cannot contain extentions.');

      // if (!_isString(output))
      //   return this.log.error('configuration object supported only as third arguemnt for components, use <name> [output] [RegisterConfig].');

      // If a component iterate each template and output.
      const component = this.components[<string>name];
      let ctr = 0;
      let i = component.templates.length;
      const groupId = Date.now() + '-' + name;

      const groupObj: any = {
        id: Date.now(),
        name: name,
        output: output
      };

      output = output || '';
      const splitOut = (output as string).split('/');
      groupObj.component = splitOut.pop();

      while (i--) {
        const tpl = component.templates[i];
        const opts = _clone(options || {});
        let tplOut;
        if (output)
          tplOut = join(<string>output, tpl);
        this.render(tpl, tplOut, opts, null, (e, t) => {
          ctr++;
          if (ctr === component.templates.length)
            finished(e, t, groupObj);
        }, groupObj);
      }

    }

    else {

      // Ensure we have some templates loaded.
      if (!Object.keys(this.templates).length)
        return this.log.warn('whoops you no templates registed, add some templates in "register.js"');

      if (_isFunction(output)) {
        done = output;
        force = undefined;
        output = undefined;
        options = undefined;
      }

      if (_isBoolean(output)) {
        force = output;
        done = <NodeCallback>options;
        output = undefined;
        options = undefined;
      }

      if (_isPlainObject(output)) {
        done = <NodeCallback>force;
        force = <boolean>options;
        options = <IMetadata>output;
        output = undefined;
      }

      if (_isFunction(force)) {
        done = force;
        force = undefined;
      }

      if (_isFunction(options)) {
        done = options;
        force = undefined;
        options = undefined;
      }

      if (_isBoolean(options)) {
        done = <NodeCallback>force;
        force = options;
        options = undefined;
      }

      if (_isString(template)) {

        // Normalize the template.
        template = this.configure(<string>name, <string>output, <IMetadata>options);

      }

      if (_isPlainObject(name))
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
      force = force || (options && (options as IMetadata).force);
      template.group = template.metadata.$component.group = (group && group.component);

      // Configure rollback.
      rollback.template = <string>name;
      rollbackDir = join(this.options.configDir, this.rollbacksDir, rollbackId);

      const partials: IMap<string | ITemplate> = {};

      // If partials get the raw strings.
      const partialKeys = Object.keys(template.partials);
      partialKeys.forEach((p) => {
        const partial: ITemplate = template.partials[p];
        partials[p] = partial.raw;
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
      const parsedTemplateOutput = parse(template.outputPath as string);
      const parsedOutput = parse(this.outputPath);

      // Ensure the directory structure exists.
      ensureDirSync(parsedTemplateOutput.dir);

      const injects = [];
      let success = 0;
      let failed = 0;

      // BUILD MAPPED PATHS

      template.paths = template.paths || [];
      let x = template.paths.length;

      template.paths.forEach((itm: any) => {

        itm = itm.replace(/\s+/g, '').split('|');

        if (!itm.length)
          return;

        let from = itm[0];
        let to = itm[1];

        // Just continue if no from and no to.
        if (!from && !to)
          return;

        // is to self.
        const fromHasPath = (from === 'self' || _isUndefined(from));
        const toHasPath = (to === 'self' || _isUndefined(to));

        // Ensure from and to then resolve each.
        from = fromHasPath ? template.outputPath : from;
        to = toHasPath ? template.outputPath : to;

        from = resolve(this.outputPath, from);
        to = resolve(this.outputPath, to);

        const parsedIns = parse(from);
        let tmpRel = relative(parsedIns.dir, to);

        const parsedTmpRel = parse(tmpRel);
        tmpRel = parsedTmpRel.dir;

        if (parsedTmpRel.name !== 'index')
          tmpRel = join(tmpRel, parsedTmpRel.name);

        tmpRel = /^\.\./.test(tmpRel) ? tmpRel : './' + tmpRel;

        template.metadata.$component.paths.push(tmpRel);

      });

      // Iterate the inject
      template.injects.forEach((inj: IInject) => {

        const self = this;

        const injRollback: IRollback = {};
        injRollback.template = <string>name;

        if (!Array.isArray(inj.insert))
          inj.insert = [inj.insert];

        // Check if filename is self.
        if (inj.filename === 'self') {
          inj.filename = template.outputPath;
          inj.relative = false;
        }

        let resolvedInject = resolve(this.outputPath, inj.filename);

        // Check if inject filename is relative to
        // the output path being generated.
        if (inj.relative) {
          resolvedInject = resolve(parsedTemplateOutput.dir, inj.filename);
          inj.filename = relative(this.outputPath, resolvedInject);
        }

        // Store the rollback to filename.
        injRollback.rollbackTo = resolvedInject.replace(this.cwd, '').replace(/^\//, '');
        injRollback.isInject = true;

        // Parse out the injected path
        // we'll need to grab the directory.
        const parsedInject = parse(resolvedInject);

        if (existsSync(resolvedInject)) {
          const rollbackFrom = join(rollbackDir, Date.now() + '-' + parsedInject.base);
          injRollback.rollbackFrom = rollbackFrom;
          copySync(resolvedInject, rollbackFrom);
        }

        let n = inj.insert.length;
        while (n--) {
          inj.insert[n] = this.renderer(inj.insert[n], template.metadata);
        }

        const wrapper = (cb) => {

          this.inject(inj, (err) => {

            if (err) {
              this.log.warn(err.message);
              failed += 1;
            }

            else {
              success += 1;
              // If successful push the rollback
              this.addRollback(rollbackId, injRollback);
            }

            // callback to continue.
            cb();

          });

        };

        injects.push(wrapper);

      });

      // Call before render hook.
      template.beforeRender(template, () => {

        let outputName = this.transformCase(parsedTemplateOutput.name, template.filenameCasing || 'lower');

        let outputPath = join(parsedTemplateOutput.dir, outputName + parsedTemplateOutput.ext);

        // Render the template.
        template.rendered = this.renderer(template.body, template.metadata, partials);

        // Store the rollback to path.
        rollback.rollbackTo = outputPath.replace(this.cwd, '').replace(/^\//, '');

        // Don't write to file.
        if (template.noOutput) {

          template.afterRender(template);

          finished(null, template);

        }
        else {

          if (existsSync(outputPath)) {

            if (force !== true)
              return this.log.warn(`cannot generate the file ${template.outputRelative} exists, use -f from cli or pass force in render overwrite.`);

            // If exists then we'll need to copy existing for rollback.
            const rollbackFrom = join(rollbackDir, Date.now() + '-' + outputName + parsedTemplateOutput.ext);
            rollback.rollbackFrom = rollbackFrom;
            copySync(outputPath, rollbackFrom);

          }

          // Write the file.
          writeFile(outputPath, template.rendered, (err) => {

            if (!err)
              this.addRollback(rollbackId, rollback);

            if (err) {
              finished(err);
            }

            // No injects required just call callbacks.
            else if (!injects.length) {

              // Call after render.
              template.afterRender(template);

              // Render may be called directly with done callback.
              finished(null, template);

            }

            else {

              // Iterate injects.
              series(injects, (err: Error, results) => {

                if (success === 0 && failed > 0)
                  this.log.error(`${success} successfully injected ${failed} failed.`);
                else if (failed > success)
                  this.log.warn(`${success} successfully injected ${failed} failed.`);
                else
                  this.log.info(`${success} successfully injected ${failed} failed.`);

                // Call done/after callbacks.
                template.afterRender(template);

                finished(null, template);

              });

            }

          });

        }

      });

    }

  }

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
  inject(filename: string | IInject,
    find?: string | RegExp | NodeCallback,
    strategy?: 'before' | 'after' | 'first' | 'last' | 'replace',
    insert?: string | string[],
    done?: NodeCallback): void {

    let data = [];
    let idx = 0;
    let matches = 0;
    let insertLen = 0;
    let lastMatch = 0;
    let exp: RegExp;

    // Allows done callback as second arg.
    if (_isFunction(find))
      done = find;

    if (_isPlainObject(filename)) {
      const obj = filename as IInject;
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
      const start = arr.slice(0, index);
      const end = arr.slice(index);
      return [].concat(start).concat(item).concat(end);
    }

    // Sets indentation for inserts.
    function setIndent(from, to) {
      const indent = di(from).indent;
      to.forEach((t, i) => {
        to[i] = (indent + t);
      });
      return to;
    }

    // Resolve the filename.
    filename = resolve(this.outputPath, filename);

    if (!existsSync(filename as string))
      return done(new Error(`failed to inject in ${relative(this.outputPath, filename)}, file not found.`));

    exp = find as RegExp;

    // If is string convert to expression.
    if (_isString(exp))
      exp = new RegExp(exp);

    // Normalize the insert
    if (_isString(insert))
      insert = [insert];

    insert = insert || [];

    insertLen = insert.length;

    const rl = readline.createInterface({
      input: createReadStream(filename as string)
    });

    rl.on('line', (line) => {

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

      // If not match just push.
      else {

        data.push(line);

      }

      // keep track of our index.
      idx += 1;

      if (exp.test(line))
        lastMatch = idx;

    });

    rl.on('close', () => {

      if (strategy === 'last' && matches > 0 && lastMatch >= 0) {
        insert = setIndent(data[lastMatch - 1], insert);
        data = insertAt(data, lastMatch, insert);
      }

      const joined = data.join(EOL);
      writeFile(filename as string, joined, (err) => {

        const insertStr = (insert as string[]).join(', ');

        if (err)
          this.log.warn(err);
        else
          this.log.info(`injected: ${this.truncate(insert, 18)} in: ${parse(filename as string).base}.`);

        // Pass error back for render counter.
        // does not count when manually calling
        // .inject method.
        done(err);

      });

    });

  }

  /**
   * Rollback
   * Rolls back and removes generated templates.
   *
   * NOTE: currently does not rollback injects.
   *
   * @param name the template or group name.
   */
  rollback(name?: string, output?: string): IMustr {

    let template: ITemplate;
    let templates: ITemplate[] = [];
    let isGroup;
    let failed = 0;
    let success = 0;

    // Check if is rollback id.
    let isRollbackId = this.rollbackIdExp.test(name);

    // Check if no id, if true get last.
    if (_isUndefined(name)) {
      name = _keys(this.rollbacks).sort().pop();
      isRollbackId = true;
    }

    const finish = () => {

      // If a rollback id we need to
      // remove from from rollbacks.json
      // and any associated rollback files.
      if (isRollbackId)
        this.removeRollbacks(name);

      if (isGroup)
        if (failed > success)
          this.log.error(`rolled back ${name} ${success} successful with ${failed} failing.`);
        else
          this.log.info(`rolled back ${name} ${success} successful with ${failed} failing.`);

      else
        if (failed === 0)
          this.log.info(`successfully rolled back ${name} at ${templates[0].outputRelative}.`);
        else
          this.log.error(`failed to roll back ${templates[0].name} at ${templates[0].outputRelative}.`);

      console.log();

    };

    // Rolling back from known rollback.
    if (isRollbackId) {

      // Rollbacks by id are always groups.
      isGroup = true;

      // Get the rollback.
      const rb: IRollbackContainer = this.rollbacks[name];

      if (!rb) {
        this.log.error('cannot rollback using rollback instance of undefined.');
        return this;
      }

      let i = rb.rollbacks.length;
      while (i--) {
        const rollback = rb.rollbacks[i];
        const to = resolve(this.cwd, rollback.rollbackTo);
        // If from copy from backed up file.
        if (rollback.rollbackFrom) {
          const from = resolve(this.cwd, rollback.rollbackFrom);
          try {
            copySync(from, to);
            success++;
          } catch (ex) {
            this.log.warn(`failed to rollback from ${rollback.rollbackFrom} to ${rollback.rollbackTo}.`);
            failed++;
          }
        }
        // Otherwise just delete the to file.
        else {
          try {
            removeSync(to);
            success++;
          } catch (ex) {
            this.log.warn(`failed to remove ${rollback.rollbackTo}.`);
            failed++;
          }
        }
      }

      finish();

    }

    // Manually rolling back by template and output path.
    else {

      name = name.toLowerCase().replace(this.tplexp, '');

      // Check if name is a component of templates.
      if (this.components[name]) {
        const comps = this.components[name];
        isGroup = true;
        let i = comps.templates.length;
        while (i--) {
          const tpl = comps.templates[i];
          templates.push(this.configure(comps.templates[i], join(output, tpl)));
        }
      }

      // Is single template.
      else {
        templates.push(this.configure(name, output));
      }

      // Iterate templates and remove.
      let i = templates.length;
      while (i--) {
        const t = templates[i];
        try {
          removeSync(t.outputPath);
          if (isGroup)
            this.log.info(`successfully removed ${t.name} at ${t.outputRelative}.`);
          success++;
        }
        catch (ex) {
          this.log.warn(`could not remove generated template using path ${t.outputRelative}`);
          failed++;
        }
      }

      finish();

    }

    return this;

  }

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
  removeRollbacks(by: string | number | Date, save?: boolean): IMustr {

    let date: Date;
    let count: any = 0;
    let rollbackId;

    // Internal helper removes by key
    // checks if rollbacks folder exists
    // if yes unlinks/deletes it.
    const removeByKey = (key) => {

      // Delete from collection.
      delete this.rollbacks[key];

      // If folder exists remove rollbacks folder.
      const rollbackPath = join(this.options.configDir, this.rollbacksDir, key);

      // If path exists remove.
      if (existsSync(rollbackPath))
        removeSync(rollbackPath);

      // Check if should save rollback changes.
      if (save !== false)
        this.saveRollbacks();

    };

    // Check if is rollback id or
    // string to be converted to date.
    if (_isString(by)) {
      if (this.rollbackIdExp.test(by))
        rollbackId = by;
      else
        date = new Date(by);
    }

    else if (_isNumber(by))
      count = by;

    else if (by instanceof Date)
      date = by;

    else
      this.log.error(`unsupported typeof ${typeof by} detected.`);

    const keys = _keys(this.rollbacks).sort();

    // Ensure count is no more than one
    // less than the lenght of keys.
    if (count >= keys.length)
      count = keys.length - 1;

    // Delete by id.
    if (rollbackId) {
      removeByKey(rollbackId);
    }

    // Delete by count.
    else if (count > 0) {

      let ctr = 0;

      while (ctr < count) {
        const key = keys[ctr];
        removeByKey(key);
        ctr++;
      }

    }

    else if (date) {

      const filterDate = date.getTime();

      keys.forEach((k, i) => {

        if ((i + 1) >= keys.length)
          return;

        let ts: any = Number(k.split('-')[0]);

        if (ts < filterDate) {
          removeByKey(k);
        }

      });

    }

    else {
      this.log.warn(`0 rollbacks removed, unsupported type ${typeof by} or no unmatched criteria.`);
    }

    return this;

  }

  /**
   * Reindex Rollbacks
   * Iterates rollbacks.json re-sorts order
   * optionally prunes records where rollback
   * files are missing.
   *
   * @param prune when true prunes entries where missing required rollback folder/files.
   */
  reindexRollbacks(prune?: boolean): IMustr {

    const keys = _keys(this.rollbacks).sort();
    const dirs = this.getDirs(resolve(this.options.configDir, this.rollbacksDir));
    const tmp: IMap<IRollbackContainer> = {};


    // If directories ensure matching
    // keys in rollbacks.json.
    if (prune !== false) {

      dirs.forEach((d) => {

        // If key doesn't exist remove dir.
        if (keys.indexOf(d) === -1)
          removeSync(resolve(this.options.configDir, this.rollbacksDir, d));

      });

    }

    // Iterate keys and ensure rollbacks
    // contain value paths etc.
    keys.forEach((k) => {

      let rb = this.rollbacks[k];
      let i = rb.rollbacks.length;

      // Check if should prune.
      if (prune !== false) {

        while (i--) {
          const r = rb.rollbacks[i];
          if (r.rollbackFrom && !existsSync(r.rollbackFrom))
            delete rb.rollbacks[i];
        }

        // If we still have rollbacks then add
        // to the temp object.
        if (rb.rollbacks && rb.rollbacks.length)
          tmp[k] = rb;

      }

      // Otherwise just add to
      // temp object.
      else {
        tmp[k] = rb;
      }

    });

    // Update to reindex object.
    this.rollbacks = tmp;

    return this;

  }

  /**
   * Load Rollbacks
   * Loads the rollbacks config file.
   */
  loadRollbacks(reindex?: boolean): IMustr {
    this.rollbacks = this.tryRequire(this.rollbacksPath);
    if (reindex)
      this.reindexRollbacks();
    return this;
  }

  /**
   * Show Rollbacks
   * Shows details/stats for recoreded rollbacks.
   *
   * @param display when false will NOT display stats in console.
   */
  getRollbacks(): IMap<IRollbackStat> {
    const obj = this.rollbacks;
    const result: { [key: string]: IRollbackStat } = {};
    const keys = Object.keys(this.rollbacks).sort();
    let i = keys.length;
    while (i--) {
      const id = keys[i];
      const rb: IRollbackContainer = this.rollbacks[id];
      const tmp: IRollbackStat = {};
      tmp.id = id;
      tmp.timestamp = rb.timestamp;
      tmp.count = rb.rollbacks.length;
      tmp.templates = rb.rollbacks.map(r => r.template);
      result[id] = tmp;
    }
    return result;
  }

  /**
   * Save Rollbacks
   * Writes current rollbacks to file.
   *
   * @param prune when false prevents pruning rollbacks before save.
   */
  saveRollbacks(prune?: boolean): IMustr {

    const keys = _keys(this.rollbacks).sort();
    let removeCount = this.options.maxRollbacks === 0 ? 0 : keys.length - this.options.maxRollbacks;

    // Check if should prune previous
    // rollbacks.
    if (removeCount > 0 && prune !== false)
      return this.removeRollbacks(removeCount);

    writeFileSync(this.rollbacksPath, JSON.stringify(this.rollbacks, null, 2));

    return this;

  }

  /**
   * Transform To
   * Transforms a string to the desired casing.
   *
   * @param str the string to be transformed.
   * @param to the casing to be transformed to using lodash.
   */
  transformCase(str: string, to: string): string {

    let caseMap: any = {
      lower: _lowerCase,
      upper: _upperCase,
      capitalize: _capitalize,
      camel: _camelCase,
      lowerCase: _lowerCase,
      upperCase: _upperCase,
      camelCase: _camelCase,
      title: (str) => {
        return _startCase(_toLower(str));
      }
    };

    const validTypes = _keys(caseMap);

    caseMap.titleCase = caseMap.title;
    to = to.trim();

    if (_isUndefined(caseMap[to])) {
      this.log.warn(`invalid transform case ${to} (${chalk.cyan(validTypes.join(', '))}).`);
      return str;
    }

    let splitStr = str.split('.');

    splitStr = splitStr.map((s) => {
      return caseMap[to](s).replace(/\s/g, '');
    });

    return splitStr.join('.');

  }

}