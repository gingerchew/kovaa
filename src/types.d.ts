type ReactiveElement<T> = {
    $store:T;
    #connected?: () => void;
    #disconnected?: () => void;
    #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
    ac: AbortController;
} & HTMLElement & {
    [Property in keyof T]: T[Property]
}



type $Store = Record<string, any>;

export { ReactiveElement, $Store }