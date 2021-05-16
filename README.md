# scanner

File System Utilities

## API

### Package

**Create:**

```js
const scanner = require('scanner');

// Create package instance
let pack = new scanner.Package('/path/to/package');
```

**Paths:**

```js
// Resolve path by package's dirname
let filename = pack.resolve('lib/index.js');
```

**Package:**

```js
// Loads `package.json` data
let data = pack.getPackage();

let [major, minor, patch] = pack.getVersion();
```

**Files list:**

```js
// Returns list of files and directories of package's directory (relative)
let files = pack.getFiles([subdirectory]);

// Returns list of files and directories of package's directory (absolute)
let files = pack.getFilenames([subdirectory]);

// Returns list of all files and directories of package's directory (recursive, relative)
let files = pack.getFilesRecursive([subdirectory]);

// Returns list of all files and directories of package's directory (recursive, absolute)
let files = pack.getFilenamesRecursive([subdirectory]);
```
