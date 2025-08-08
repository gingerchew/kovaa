const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

const makeLocalName = (s:string, scope?: string) => {
    let localName = s.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
    
    if (scope) return `${scope}-${localName}`;

    return localName.indexOf('-') < 0 ? `x-${localName}` : localName;
}

export { $t, makeLocalName }