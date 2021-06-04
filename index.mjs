import chalk from 'chalk';
import JestHasteMap from 'jest-haste-map';
import {Worker} from 'jest-worker';
import {cpus} from 'os';
import {dirname, join, relative} from 'path';
import {fileURLToPath} from 'url';

// Get the root path to our project
const root = dirname(fileURLToPath(import.meta.url));

const worker = new Worker(join(root, 'worker.js'), {
  enableWorkerThreads: true,
});

const hasteMap = new JestHasteMap.default({
  extensions: ['js'],
  maxWorkers: cpus().length,
  name: 'best',
  platforms: [],
  rootDir: root,
  roots: [root],
});

const {hasteFS} = await hasteMap.build();
const testFiles = hasteFS.matchFilesWithGlob([
  process.argv[2] ? `**/${process.argv[2]}*` : '**/*.test.js',
]);

let hasFailed = false;
for await (const testFile of testFiles) {
  const {success, testResults, errorMessage} = await worker.runTest(testFile);
  const status = success 
    ? chalk.green.inverse.bold(' PASS ')
    : chalk.red.inverse.bold(' FAIL ');

  console.log(status + ' ' + chalk.dim(relative(root, testFile)));
  if (!success) {
    hasFailed = true;
    if (testResults) {
      testResults
        .filter((result) => result.errors.length)
        .forEach((result) =>
          console.log(
            result.testPath.slice(1).join(' ') + '\n' + result.errors[0],
          ),
       );
    } else if (errorMessage) {
      console.log(' ' + errorMessage);
    }
  }
}

worker.end();

if (hasFailed) {
  console.log(
  '\n' + chalk.red.bold('Test run failed, please fix all the failing tests.'),
  );
  process.exitCode = 1;
}
