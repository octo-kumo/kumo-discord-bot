import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";

export default [
    {
        input: "src/index.ts",
        plugins: [typescript()],
        external: ["axios", "deprecated-decorator"],
        output: [
            {
                file: `${pkg.main}.js`,
                format: "cjs",
                exports: "named"
            },
            {
                file: `${pkg.main}.mjs`,
                format: "esm"
            }
        ]
    }
];
