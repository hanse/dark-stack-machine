
var instructionSet = {
  add: 0x00,
  and: 0x01,
  band: 0x02,
  bnot: 0x03,
  bor: 0x04,
  bxor: 0x05,
  call: 0x06,
  div: 0x07,
  drop: 0x08,
  dup: 0x09,
  end: 0x0A,
  eq: 0x0B,
  ge: 0x0C,
  gt: 0x0D,
  jfalse: 0x0E,
  jmp: 0x0F,
  jtrue: 0x10,
  le: 0x11,
  lt: 0x12,
  mod: 0x13,
  mul: 0x14,
  ne: 0x15,
  not: 0x16,
  or: 0x17,
  pop: 0x18,
  popa: 0x19,
  pull: 0x1A,
  push: 0x1B,
  pusha: 0x1C,
  ret: 0x1D,
  rot: 0x1E,
  stop: 0x1F,
  sub: 0x20,
  swap: 0x21,
  xor: 0x22
};

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
  this.code = [];
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
  this.finished = false;
  this.startLabel = '';
};

/**
 * Load a string of Dark assembly code
 * into the machine.
 */
VirtualMachine.prototype.load = function(string) {
  var contents = string.split('\n').filter(notBlank)
    , self = this;

  this.code = [];

  contents.forEach(function(line, i) {
    var commentStart = line.indexOf(';');
    if (commentStart != -1) {
      line = line.slice(0, commentStart-1);
    }

    var parts = line.trim().split(' ');
    if (parts.length === 1) {
      if (parts[0] in instructionSet) {
        self.code.push([parts[0], ''])
      } else {
        self.code.push(['LABEL', parts[0]]);
        self.labels[parts[0]] = i;
      }
    } else {
      self.code.push([parts[0], parts[1]])
    }

    if (parts[0] === 'end') {
      self.startLabel = parts[0] || 0;
    }
  });
};

/**
 *
 */
VirtualMachine.prototype.jumpToLabel = function(label) {
  if (label in this.labels)
    this.programCounter = this.labels[label];
};

/**
 *
 */
VirtualMachine.prototype.executeSingle = function() {
  var currentInstruction = this.code[this.programCounter]
    , label = currentInstruction[0]
    , arg   = currentInstruction[1]

  console.log('--> %s %s. Stack: %s. PC: ', label, arg, this.stack, this.programCounter);

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

      this.stack.push((a&b)|0);
      break;
    case 'bnot':
      var a = this.stack.pop()
      this.stack.push((!a)|0);
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

      this.stack.push(a/b);
      break;
    case 'drop':
      this.stack.pop();
      break;
    case 'dup': // probably avoid the popping and just do a peek
      var a = this.stack.pop();
      this.stack.push(a, a);
      break;
    case 'end':
      this.finished = true;
      break;
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
      this.stack.push(this.symbols[arg]);
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
    case 'stop':
      return false;
    case 'sub':
      var a = this.stack.pop()
        , b = this.stack.pop();
      this.stack.push(a-b);
      break;
    case 'swap':
      var a = this.stack.pop()
        , b = this.stack.pop()

      this.stack.push(b, a);

      break;
    case 'xor':
      break;
  }

  if (++this.programCounter >= this.code.length) return false;
};

/**
 * Run the program until it exits.
 */
VirtualMachine.prototype.run = function() {
  var start = this.startLabel;
  if (start !== 0) start = this.labels[start];

  var self = this;
  var main = setInterval(function() {
    self.executeSingle();
    if (self.finished) {
      clearInterval(main);
      console.log("Result %s", self.stack[0]);
    }
  }, 200)
};

module.exports = new VirtualMachine();
