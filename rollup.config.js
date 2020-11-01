import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';


export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
    }
  ],
  external: ["@yarnpkg/lockfile", "fs-extra"],

  plugins: [
    babel({ babelHelpers: 'bundled' }),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
  ],
}
