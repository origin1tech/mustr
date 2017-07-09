import { ILogger, IPargv } from 'pargv';

export type BeforeRender = { (template?: ITemplate, done?: { () }) };

export type AfterRender = { (template?: ITemplate) };

export type NodeCallback = { (err?: any, data?: any) };

export type RenderMethod = (body: string, metadata: any, partials?: any) => string;

export type InjectCallback = { (line: string, data: string, done: { (line: string, data: string) }) };

export type TextCasing = 'lower' | 'upper' | 'camel' | 'title' | 'capitalize';

export type BeforeInjectInsert = (component: IMetadataComponent, template?: ITemplate) => string;

export interface IMap<T> {
  [key: string]: T;
}

export interface IMetadataComponent {
  name?: string;
  fullname?: string;
  group?: string;
  ext?: string;
  path?: string;
  paths?: string[];
}

export interface IMetadata {
  $component?: IMetadataComponent;   // the component name generated from command line.
  [key: string]: any;                // other metadata passed in template or on rendering.
}

export interface IConfig {

  name?: string;                // name of template used ONLY when passing static templates.
  ext?: string;                 // extension to use when rendered.
  type?: string;                // type suffix to be added to the component name.
  appendType?: boolean;         // when true type name is added to the output filename.
  casing?: TextCasing;          // component name case.
  filenameCasing?: TextCasing;
  injects?: any[];
  rename?: string;              // renames the file.
  outputDir?: string;           // base output dir or use in outputDir in options.
  beforeRender?: BeforeRender;  // the callback before rendering/compiling template.
  afterRender?: AfterRender;    // the callback after rending the template to file.
  partials?: string | string[] | IMap<string | ITemplate>;  // object conatianing template's partials.
  metadata?: IMetadata;         // metadata for template rendering.
  noOutput?: boolean;           // when true won't write out to file.

}

export interface ITemplate extends IConfig {

  path?: string;                // the path to the template if not static defined template.
  pathNormalized?: string;      // the path without template extension.
  body?: string;                // the template body.
  outputPath?: string;          // the path to output the template to.
  outputRelative?: string;      // path relative to the config's base output dir.
  raw?: string;                 // a static template that has not been parsed.
  rendered?: string;            // the rendered string result.
  isAbsolute?: boolean;         // when outputPath is statically provided is absolute.
  isPartial?: boolean;          // indicates the template is a partial.
  isStatic?: boolean;           // when true is statically defined template.
  group?: string;               // template is part of a group being rendered.
  paths?: string[];

}

export interface IComponent {
  name?: string;
  templates: string[];
}

export interface IRollback {
  template?: string;
  isInject?: boolean;
  rollbackFrom?: string;
  rollbackTo?: string;
}

export interface IRollbackContainer {
  timestamp?: string;
  rollbacks?: IRollback[];
}

export interface IRollbackStat {
  id?: string;
  timestamp?: string;
  count?: number;
  templates?: string[];
}

export interface IRegisterConfig extends IConfig {
  template?: string;
}

export interface IRegister {
  partials(...args: any[]): IRegister;
  partials(partials: string | string[] | IMap<string | ITemplate>): IRegister;
  beforeRender(beforeRender: BeforeRender): IRegister;
  afterRender(afterRender: AfterRender): IRegister;
}

export interface IInject {
  filename: string;
  find: string | RegExp;
  strategy: 'before' | 'after' | 'first' | 'last' | 'replace';
  insert: string | string[];
  done: NodeCallback;
  relative?: boolean;             // when true filename relative to output path of source file.
}

export interface IMustrOptions {
  configDir?: string;         // the Muster dir containing templates and register.
  outputDir?: string;         // the output directory when templates are rendered.
  templateExt?: string;       // the extension for templates usually .tpl.
  autoLoad?: boolean;         // when true auto loads templates, rollbacks etc.
  autoRegister?: boolean;     // when true templates are auto registered using defaults.
  engine?: Object;            // optional engine for compiling/rendering templates.
  renderer?: RenderMethod;    // the renderer method for rendering the template.
  maxRollbacks?: number;      // maximum number of stored rollbacks.
}

export interface IMustr {

  Engine: Object;
  renderer: RenderMethod;
  cwd: string;
  log: ILogger;
  registerPath: string;
  templatesPath: string;
  outputPath: string;
  templatesGlob: string[];
  templates: IMap<ITemplate>;
  components: IMap<IComponent>;
  options: IMustrOptions;

  init(force?: boolean): void;
  load(): IMustr;
  setEngine(Engine: Object, renderer: RenderMethod);

  register(options: IRegisterConfig): IRegister;
  register(name: string | IRegisterConfig, template?: string | IRegisterConfig, options?: IRegisterConfig): IRegister;

  registerComponent(name: string, series: boolean): IMustr;
  registerComponent(name: string, ...args: string[]): IMustr;

  configure(name: string, options: IRegisterConfig): ITemplate;
  configure(name: string, output: string, group: string);
  configure(name: string, output?: string | IRegisterConfig, options?: IRegisterConfig | string): ITemplate;

  render(template: ITemplate, done?: NodeCallback): void;
  render(template: ITemplate, force?: boolean, done?: NodeCallback): void;
  render(template: ITemplate, options?: IRegisterConfig, done?: NodeCallback): void;
  render(template: ITemplate, options?: IRegisterConfig, force?: boolean, done?: NodeCallback): void;
  render(name: string | ITemplate, output?: string | IRegisterConfig | NodeCallback | boolean, options?: IRegisterConfig | NodeCallback | boolean, force?: boolean | NodeCallback, done?: NodeCallback, group?: string): void;

  rollback(name?: string, output?: string): IMustr;
  removeRollbacks(by: string | number | Date, save?: boolean): IMustr;
  saveRollbacks(prune?: boolean): IMustr;
  loadRollbacks(reindex?: boolean): IMustr;
  getRollbacks(display?: boolean): IMap<IRollbackStat>;

  inject(options: IInject, done?: NodeCallback): void;
  inject(filename: string | IInject,
    find: string | RegExp | NodeCallback,
    insert: string | string[],
    strategy: 'before' | 'after' | 'first' | 'last' | 'replace',
    done?: NodeCallback): void;
  transformCase(str: string, to: string): string;

}
