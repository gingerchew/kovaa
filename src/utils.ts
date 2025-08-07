const $t = (obj:unknown) => Object.prototype.toString.call(obj).slice(8, -1);

export { $t }