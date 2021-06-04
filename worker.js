const fs = require("fs");
const vm = require("vm");
const expect = require("expect");
const mock = require("jest-mock");
const { describe, it, run, resetState } = require("jest-circus");
const NodeEnvironment = require("jest-environment-node");
const { dirname, join } = require("path");

exports.runTest = async function (testFile) {
  const code = await fs.promises.readFile(testFile, "utf8");
  let environment;

  const customRequire = (fileName) => {
    const code = fs.readFileSync(join(dirname(testFile), fileName), "utf8");
    const moduleFactory = vm.runInContext(
      `(function(module, require) {${code}})`,
      environment.getVmContext(),
    );
    const module = {exports: {}};
    moduleFactory(module, customRequire);
    return module.exports;
  };

  environment = new NodeEnvironment({
    testEnvironmentOptions: {
      describe,
      it,
      expect,
      mock,
      require: customRequire,
    },
  });

  const testResult = {
    success: false,
    errorMessage: null,
  };
  try {
    resetState();
    vm.runInContext(code, environment.getVmContext());
    const { testResults } = await run();
    testResult.testResults = testResults;
    testResult.success = testResults.every((result) => !result.errors.length);
  } catch (error) {
    testResult.errorMessage = error.message;
  }
  return testResult;
};
