/// <reference types="node" />
import { ILogger } from 'pargv';
import { EventEmitter } from 'events';
import { IMustr, IMustrOptions, ITemplate, NodeCallback, IRegister, IRegisterConfig, IInject, IComponent, RenderMethod, IRollback, IRollbackContainer, IRollbackStat, IMap } from './interfaces';
export declare class Mustr extends EventEmitter implements IMustr {
    private tplexp;
    private loaded;
    private rollbacksDir;
    rollbackIdExp: RegExp;
    Engine: Object;
    renderer: RenderMethod;
    cwd: string;
    log: ILogger;
    configPath: string;
    registerPath: string;
    templatesPath: string;
    outputPath: string;
    rollbacksPath: string;
    templatesGlob: string[];
    templates: IMap<ITemplate>;
    components: IMap<IComponent>;
    rollbacks: IMap<IRollbackContainer>;
    options: IMustrOptions;
    constructor(options?: IMustrOptions);
    /**
     * Has Matter
     * Tests if string contains front matter.
     *
     * @param str the string to inspect.
     */
    private hasMatter(str);
    /**
     * Has Template
     * Loosly check if string contains template chars.
     *
     * @param str the string to inspect.
     */
    private hasTemplate(str);
    /**
     * Try Require
     * Tries to require a module logging error if failed.
     *
     * @param path the module path to be required.
     */
    private tryRequire(path);
    /**
     * Normalize Extension
     * Ensures extension begins with "."
     *
     * @param ext the extension to be normalized.
     */
    private normalizedExt(ext);
    /**
     * Normalize
     * Parses/normalizes a template name, path or static template string.
     * When passing a name it searches loaded template paths and matches
     * the filename to the template name passed.
     *
     * @param template the template name, path or static template string.
     */
    private normalize(template);
    /**
     * Normalize Name
     * Removes extention from template name.
     *
     * @param name the template name to normalize.
     */
    private normalizeName(name);
    /**
     * Truncate
     * Nothing special, cheesy truncation...move along.
     *
     * @param str the string to be truncated.
     * @param max the max len before truncating.
     */
    private truncate(str, max);
    /**
     * Get Partial
     *
     * @param partial the partial to get.
     */
    private getPartial(partial);
    /**
     * Add Partials
     *
     * @param template the template to add partials to.
     * @param args the list of partials to add.
     */
    private addPartials(template, ...args);
    /**
     * Get Dirs
     * Takes a base directory then retrives
     * all sub directories for that directory.
     *
     * @param dir base directory to get all sub directories from.
     */
    private getDirs(dir);
    /**
     * Init
     * Initializes Mustr for current project
     *
     * @param force when true forces init.
     */
    init(force?: boolean): void;
    /**
     * Load
     * Loads the template paths and config.
     */
    load(): IMustr;
    /**
     * Set Engine
     * Allows for setting the templating Engine
     * that should be used for rendering.
     *
     * @param Engine the template Engine used for rendering.
     * @param renderer the rendering method.
     */
    setEngine(Engine: Object, renderer: RenderMethod): ILogger;
    /**
     * Configure
     * Configures template for output.
     *
     * @param name the name of the template to load.
     * @param output the output name/path to use when rendering.
     * @param options the optional config for the template.
     */
    configure(name: string, output?: string | IRegisterConfig, options?: IRegisterConfig): ITemplate;
    /**
     * Register
     * Registers a template with Mustr.
     *
     * @param name to use when registering a template.
     * @param template the template name or path to lookup or a static string.
     * @param options the template front matter which overrides static properties.
     */
    register(name: string | IRegisterConfig, template?: string | IRegisterConfig, options?: IRegisterConfig): IRegister;
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
    registerComponent(name: string | IComponent, ...args: any[]): IMustr;
    /**
     * Register Group
     * Just a patch for backward compatibility.
     *
     * @param args arguments for registerComponent.
     */
    registerGroup(...args: any[]): IMustr;
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
    render(name: string | ITemplate, output?: string | IRegisterConfig | NodeCallback | boolean, options?: IRegisterConfig | NodeCallback | boolean, force?: boolean | NodeCallback, done?: NodeCallback, group?: any): ILogger;
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
    inject(filename: string | IInject, find?: string | RegExp | NodeCallback, strategy?: 'before' | 'after' | 'first' | 'last' | 'replace', insert?: string | string[], done?: NodeCallback): void;
    /**
  <<<<<<< HEAD
     * Add Rollback
     * Adds a rollback to the collection.
     *
     * @param id the id of the rollback to add.
     * @param rollback the rollback object.
     */
    addRollback(id: string, rollback: IRollback): IRollbackContainer;
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
    rollback(name?: string, output?: string): IMustr;
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
    removeRollbacks(by: string | number | Date, save?: boolean): IMustr;
    /**
     * Reindex Rollbacks
     * Iterates rollbacks.json re-sorts order
     * optionally prunes records where rollback
     * files are missing.
     *
     * @param prune when true prunes entries where missing required rollback folder/files.
     */
    reindexRollbacks(prune?: boolean): IMustr;
    /**
     * Load Rollbacks
     * Loads the rollbacks config file.
     */
    loadRollbacks(reindex?: boolean): IMustr;
    /**
     * Show Rollbacks
     * Shows details/stats for recoreded rollbacks.
     *
     * @param display when false will NOT display stats in console.
     */
    getRollbacks(): IMap<IRollbackStat>;
    /**
     * Save Rollbacks
     * Writes current rollbacks to file.
     *
     * @param prune when false prevents pruning rollbacks before save.
     */
    saveRollbacks(prune?: boolean): IMustr;
    /**
     * Transform To
     * Transforms a string to the desired casing.
     *
     * @param str the string to be transformed.
     * @param to the casing to be transformed to using lodash.
     */
    transformCase(str: string, to: string): string;
}
