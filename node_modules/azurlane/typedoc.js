module.exports = {
    src: [
        "./lib",
    ],
    mode: "file",
    includeDeclarations: true,
    tsconfig: "tsconfig.json",
    out: "./docs",
    excludePrivate: true,
    excludeProtected: true,
    excludeExternals: true,
    excludeNotExported: true,
    readme: "README.md",
    name: "Azur Lane",
    ignoreCompilerErrors: true,
    listInvalidSymbolLinks: true
};