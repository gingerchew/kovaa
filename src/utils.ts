const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

const makeLocalName = (s:string, prefix?: string) => {
    let localName = s.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
    
    if (prefix) return `${prefix}-${localName}`;

    return localName.indexOf('-') < 0 ? `x-${localName}` : localName;
}


const scopeCache = Object.create(null);
const parseScope = (element: HTMLElement):Record<string, any> => {
    if (!element.hasAttribute('x-scope')) return {};
    const unparsedScope = element.getAttribute('x-scope')!;

    scopeCache[unparsedScope] ??= new Function(`return (${element.getAttribute('x-scope')})`)();
    element.removeAttribute('x-scope');
    
    return scopeCache[unparsedScope];
}

export { $t, makeLocalName, parseScope }