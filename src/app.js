
var vm      = require('./vm')
  , app     = angular.module('DarkStackMachine', []);

app.controller('VirtualMachineController', ['$scope', '$timeout',
  function($scope, $timeout) {

  $scope.code = "";


  vm.load($scope.code);

  /**
   * ms to wait before executing next instruction.
   */
  var executionDelay = 400;

  /**
   * Copy of the program counter so we can
   * visualize the current instruction.
   */
  $scope.currentInstruction = vm.programCounter;

  $scope.instructions = [];

  $scope.stack = [];

  $scope.finishedRunning = false;

  $scope.loadCode = function() {
    vm.load($scope.code);
    $scope.instructions = vm.code;
  };

  /**
   * Execute a single program instruction
   */
  $scope.executeSingle = function() {
    $scope.currentInstruction = vm.programCounter;
    $scope.stack = vm.stack;
    return vm.executeSingle();
  };

  /**
   * Execute the entire program with a little
   * delay between each instruction.
   */
  $scope.executeAll = function() {
    var execute = function() {
      if ($scope.executeSingle())
        $timeout(execute, executionDelay);
      else
        $scope.finishedRunning = true;
    };
    $timeout(execute, executionDelay);
  };
}]);
