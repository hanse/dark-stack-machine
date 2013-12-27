
var instructionSet = require('./instruction-set');

/**
 * To be used with Array.filter()
 */
var notBlank = function(string) {
  return string.trim() !== '';
};

/**
 *
 */
function VirtualMachine() {
  if (!(this instanceof VirtualMachine)) return new VirtualMachine();
  this.reset();
}

/**
 *
 */
VirtualMachine.prototype.reset = function() {
  this.programCounter = 0;
  this.stack = [];
  this.symbols = {};
  this.returnStack = [];
  this.labels = {};
  this.startLabel = '';
  this.code = [];
};

/**
 * Load a string of Dark assembly code
 * into the machine.
 *
 * Preprocesses the code to resolve labels
 * and interesting things like that.
 */
VirtualMachine.prototype.load = function(string) {
  var contents = string.split('\n').filter(notBlank)
    , self = this;

  this.reset();

  contents.forEach(function(line, i) {
    var commentStart = line.indexOf(';');
    if (commentStart != -1)
      line = line.slice(0, commentStart-1);

    var parts = line.trim().split(' ');
    if (parts.length === 1) {
      // If the mnemonic is part of the instruction set
      // it is not a custom label.
      if (parts[0] in instructionSet) {
        self.code.push([parts[0], ''])
      } else {
        self.code.push(['LABEL', parts[0]]);
        self.labels[parts[0]] = i;
      }
    } else {
      self.code.push([parts[0], parts[1]])
    }

    // The spec says that `end` should either
    // run the given label or start from 0
    // if a label is not given.
    if (parts[0] === 'end')
      self.startLabel = parts[1] || 0;
  });
};

/**
 *
 */
VirtualMachine.prototype.jumpToLabel = function(label) {
  if (!(label in this.labels))
    throw new Error('Label ' + label + ' is not defined.');
  this.programCounter = this.labels[label];
};

/**
 *
 */
VirtualMachine.prototype.executeSingle = function() {
  var currentInstruction = this.code[this.programCounter]
    , label = currentInstruction[0]
    , arg   = currentInstruction[1]

  console.log('--> %s %s. \tStack: [%s]. \tPC: ', label, arg, this.stack, this.programCounter);

  switch (label) {
    case 'add':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(a+b);
      break;
    case 'and':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((a&&b)|0);
      break;
    case 'band':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(a&b);
      break;
    case 'bnot':
      var a = this.stack.pop()
      this.stack.push(~a);
      break;
    case 'bor':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((a|b)|0);
      break;
    case 'bxor':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((a^b)|0);
      break;
    case 'call':
      this.jumpToLabel(arg);
      break;
    case 'data': // data (number) name
      this.symbols[arg] = 0;
      break;
    case 'div':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(b/a);
      break;
    case 'drop':
      this.stack.pop();
      break;
    case 'dup': // probably avoid the popping and just do a peek
      var a = this.stack.pop();
      this.stack.push(a, a);
      break;
    case 'end':
      return false;
    case 'eq':
      var a = this.stack.pop()
        , b = this.stack.pop();

      this.stack.push((b==a)|0);
      break;
    case 'ge':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((b>=a)|0);
      break;
    case 'gt':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((b>a)|0);
      break;
    case 'jfalse':
      if (this.stack.pop() === 0) this.jumpToLabel(arg);
      break;
    case 'jmp':
      this.jumpToLabel(arg);
      break;
    case 'jtrue':
      if (this.stack.pop() === 1) this.jumpToLabel(arg);
      break;
    case 'le':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((b<=a)|0);
      break;
    case 'lt':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((b<a)|0);
      break;
    case 'mod':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(a%b);
      break;
    case 'mul':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(a*b);
      break;
    case 'ne':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((a!=b)|0);
      break;
    case 'not':
      this.stack.push((!this.stack.pop())|0);
      break;
    case 'or':
      var a = this.stack.pop()
        , b = this.stack.pop();
      this.stack.push((a||b)|0);
      break;
    case 'pop': // pop {arg}
      this.symbols[arg] = this.stack.pop();
      break;
    case 'popa':
      break;
    case 'pull':
      break;
    case 'push':
        this.stack.push(!isNaN(arg) ? parseInt(arg) : this.symbols[arg]);
      break;
    case 'pusha':
      break;
    case 'ret':
      break;
    case 'rot':
      var a = this.stack.pop()
        , b = this.stack.pop()
        , c = this.stack.pop();

      this.stack.push(a, c, b);
      break;
    case 'stop':
      return false;
    case 'sub':
      var a = this.stack.pop()
        , b = this.stack.pop();
      this.stack.push(b-a);
      break;
    case 'swap':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(a, b);

      break;
    case 'xor':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push((a^b)|0);
      break;
  }

  if (++this.programCounter >= this.code.length) return false;
  return true;
};

/**
 * Run the program until it exits.
 */
VirtualMachine.prototype.run = function(fn) {
  while (this.executeSingle()) {}
  fn(this.stack[0]);
};

module.exports = new VirtualMachine();
