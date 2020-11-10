
const { execSync } = require('child_process');
const fse = require('fs-extra');
const path = require('path');

const originalPkgJSON = require('./monoRepo/packages/root-workspace/package.json');
console.log('originalPkgJSON: ', originalPkgJSON);
const runWithParam = (params = '') => {
  execSync(`node ${path.join(__dirname, '../src/index.js')} --root-workspace=${path.join(__dirname, 'monoRepo')} root-workspace ${params}`);
}

// describe('full cycle tests', () => {
//   afterEach(() => {
//     fse.writeFileSync(
//       path.join(__dirname, 'monoRepo/root-workspace/package.json'),
//       JSON.stringify(originalPkgJSON, null, 2)
//     );
//   });
//   test.skip('should not set additional headers', async () => {
//     runWithParam()

//   });
// });
