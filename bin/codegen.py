#!/usr/bin/env python

from sys import stdin

lines = [line.strip() for line in sorted(stdin)]

print 'var instructions = {\n%s\n};' % ',\n'.join("  %s: 0x%.2X" % (line, index) for index, line in enumerate(lines))

print

print 'switch (label) {'
for line in lines:
  print "  case '%s':\n  break; " % line
print '};';
