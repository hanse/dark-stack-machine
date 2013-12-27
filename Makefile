STYL=$(shell find public -name *.styl)
JADE=$(shell find public -name "*.jade")
HTML=$(JADE:.jade=.html)
JS=$(shell find src -name *.js)

all: $(HTML) public/style.css public/build.js

public/style.css: $(STYL)
	stylus < public/style.styl --include /usr/local/share/npm/lib/node_modules/nib/lib > public/style.css

%.html: %.jade
	jade --pretty < $< > $@

public/build.js: $(JS)
	browserify src/app.js > public/build.js

clean:
	rm -f $(HTML)

.PHONY: clean
