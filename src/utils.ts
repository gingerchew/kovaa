const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

const makeLocalName = (s:string, prefix?: string) => {
    let localName = s.replace(/(.)([A-Z])/g, '$1-$2').toLowerCase();
    
    if (prefix) return `${prefix}-${localName}`;

    return localName.indexOf('-') < 0 ? `x-${localName}` : localName;
}

export { $t, makeLocalName }