var app = angular.module('VirtualMachine', []);

app.controller('VirtualMachineController', ['$scope', '$timeout', function($scope, $timeout) {

  var vm = new VirtualMachine();

  /**
   * ms to wait before executing next instruction.
   */
  var executionDelay = 200;

  /**
   * Copy of the program counter so we can
   * visualize the current instruction.
   */
  $scope.currentInstruction = vm.programCounter;

  /**
   * Execute a single program instruction
   */
  $scope.executeSingle = function() {
    vm.executeSingle();
    $scope.currentInstruction = vm.programCounter;
  };

  /**
   * Execute the entire program with a little
   * delay between each instruction.
   */
  $scope.executeAll = function() {
    var execute = function() {
      vm.executeSingle();
      $timeout(execute, executionDelay);
    };
    $timeout(execute, executionDelay);
  };
}]);
