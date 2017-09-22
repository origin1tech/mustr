import { Timbr } from 'timbr';
import { IColurs } from 'colurs';
export declare type BeforeRender = {
    (template?: ITemplate, done?: {
        ();
    });
};
export declare type AfterRender = {
    (template?: ITemplate);
};
export declare type NodeCallback = {
    (err?: any, data?: any);
};
export declare type RenderMethod = (body: string, metadata: any, partials?: any) => string;
export declare type InjectCallback = {
    (line: string, data: string, done: {
        (line: string, data: string);
    });
};
export declare type TextCasing = 'lower' | 'upper' | 'camel' | 'title' | 'capitalize';
export declare type BeforeInjectInsert = (component: IMetadataComponent, template?: ITemplate) => string;
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
    $component?: IMetadataComponent;
    [key: string]: any;
}
export interface IConfig {
    name?: string;
    ext?: string;
    type?: string;
    appendType?: boolean;
    casing?: TextCasing;
    filenameCasing?: TextCasing;
    injects?: any[];
    rename?: string;
    outputDir?: string;
    beforeRender?: BeforeRender;
    afterRender?: AfterRender;
    partials?: string | string[] | IMap<string | ITemplate>;
    metadata?: IMetadata;
    noOutput?: boolean;
}
export interface ITemplate extends IConfig {
    path?: string;
    pathNormalized?: string;
    body?: string;
    outputPath?: string;
    outputRelative?: string;
    raw?: string;
    rendered?: string;
    isAbsolute?: boolean;
    isPartial?: boolean;
    isStatic?: boolean;
    group?: string;
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
    relative?: boolean;
}
export interface IMustrOptions {
    configDir?: string;
    outputDir?: string;
    templateExt?: string;
    autoLoad?: boolean;
    autoRegister?: boolean;
    engine?: Object;
    renderer?: RenderMethod;
    maxRollbacks?: number;
}
export interface IMustrRollbacks {
    get(display?: boolean): IMap<IRollbackStat>;
    add(id: string, rollback: IRollback): IRollbackContainer;
    reindex(prune?: boolean): IMustr;
    save(prune?: boolean): IMustr;
    remove(by: string | number | Date, save?: boolean): IMustr;
}
export interface IMustr {
    Engine: Object;
    renderer: RenderMethod;
    cwd: string;
    log: Timbr;
    colurs: IColurs;
    options: IMustrOptions;
    rollbacks: IMustrRollbacks;
    _registerPath: string;
    _templatesPath: string;
    _outputPath: string;
    _templatesGlobs: string[];
    _templates: IMap<ITemplate>;
    _components: IMap<IComponent>;
    init(force?: boolean): void;
    load(): IMustr;
    setEngine(Engine: Object, renderer: RenderMethod): any;
    register(options: IRegisterConfig): IRegister;
    register(name: string | IRegisterConfig, template?: string | IRegisterConfig, options?: IRegisterConfig): IRegister;
    registerComponent(name: string, series: boolean): IMustr;
    registerComponent(name: string, ...args: string[]): IMustr;
    configure(name: string, options: IRegisterConfig): ITemplate;
    configure(name: string, output: string, group: string): any;
    configure(name: string, output?: string | IRegisterConfig, options?: IRegisterConfig | string): ITemplate;
    render(template: ITemplate, done?: NodeCallback): void;
    render(template: ITemplate, force?: boolean, done?: NodeCallback): void;
    render(template: ITemplate, options?: IRegisterConfig, done?: NodeCallback): void;
    render(template: ITemplate, options?: IRegisterConfig, force?: boolean, done?: NodeCallback): void;
    render(name: string | ITemplate, output?: string | IRegisterConfig | NodeCallback | boolean, options?: IRegisterConfig | NodeCallback | boolean, force?: boolean | NodeCallback, done?: NodeCallback, group?: string): void;
    rollback(name?: string, output?: string): IMustr;
    inject(options: IInject, done?: NodeCallback): void;
    inject(filename: string | IInject, find: string | RegExp | NodeCallback, insert: string | string[], strategy: 'before' | 'after' | 'first' | 'last' | 'replace', done?: NodeCallback): void;
    transformCase(str: string, to: string): string;
}
