'use strict';

const _ = require('ooi');
const fs = require('fs');
const path = require('path');

const Directory = require('./directory');

class Files extends Directory {
  getFiles(subdir = '.', isFull = false) {
    let base = this.resolve(subdir);
    return fs
      .readdirSync(base)
      .map(file => (isFull ? path.resolve(base, file) : file));
  }

  getFilenames(subdir = '.') {
    return this.getFiles(subdir, true);
  }

  getFilesRecursive(subdir = '.', isFull = false) {
    let base = this.resolve(subdir);
    return getFiles(base).map(filename =>
      isFull ? filename : path.relative(base, filename)
    );

    function getFiles(dirname) {
      let files = [];
      if (fs.existsSync(dirname) && fs.statSync(dirname).isDirectory()) {
        files = fs
          .readdirSync(dirname)
          .map(file => path.resolve(dirname, file));
      } else {
        files = null;
      }
      if (!files) return null;
      return Array.from(
        new Set(
          _.flatten([
            ...files,
            files.map(file => getFiles(file)).filter(file => !!file),
          ])
        )
      );
    }
  }

  getFilenamesRecursive(subdir = '.') {
    return this.getFilesRecursive(subdir, true);
  }
}

module.exports = Files;
