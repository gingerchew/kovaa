interface ReactiveElement extends HTMLElement {
    $store:Record<any, unknown>;
    disconnected?: () => void;
}

export { ReactiveElement }