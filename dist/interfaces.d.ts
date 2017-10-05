export declare type RendererMethod = (template: string, context: IMap<any>, partials?: any) => string;
export interface IMap<T> {
    [key: string]: T;
}
export interface IMustrOptions {
    Engine: Object;
    renderer: RendererMethod;
}
