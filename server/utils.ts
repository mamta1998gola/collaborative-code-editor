
function argsMapper(args: any[]) {
    return args.map(arg => JSON.stringify(arg)).join(' ') + '\n'
}

export {
    argsMapper
};
