interface ReactiveElement extends HTMLElement {
    $store:Record<any, unknown>;
    #disconnected?: () => void;
    #attributeChanged?: (key:string, oldValue: any, newValue: any) => void;
}

export { ReactiveElement }