(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/vm.js",function(require,module,exports,__dirname,__filename,process,global){
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
VirtualMachine.prototype.run = function() {
  var start = this.startLabel;
  if (start !== 0) start = this.labels[start];

  var self = this;
  var main = setInterval(function() {
    if (!self.executeSingle()) {
      clearInterval(main);
      console.log("Result %s", self.stack[0]);
    }
  }, 200)
};

module.exports = new VirtualMachine();

});

require.define("/instruction-set.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = {
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

});

require.define("/app.js",function(require,module,exports,__dirname,__filename,process,global){
var vm = require('./vm');

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

  $scope.instructions = vm.code;

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

});
require("/app.js");
})();

