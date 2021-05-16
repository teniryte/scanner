'use strict';

const _ = require('ooi');
const path = require('path');
const fs = require('fs');
const xyaml = require('xyaml');

const state = {
  packages: {},
};

class Directory {
  static getConstructor() {
    return this;
  }

  static get Class() {
    return this.getConstructor();
  }

  static create(dirname) {
    if (state.packages[dirname]) return state.packages[dirname];
    state.packages[dirname] = new this.Class(dirname);
    // state.packages[dirname].packages = state.packages[dirname].getPackages();
    // console.log(state.packages[dirname].packages.map(pack => pack.toJSON()));
    // state.packages[dirname].parent = state.packages[dirname].getParent();
    return state.packages[dirname];
  }

  constructor(dirname = null) {
    this.isRoot = dirname ? false : true;
    this.settings = this.getSettings();
    this.dirname = dirname
      ? fs.realpathSync(dirname || this.settings.paths.rootPackage)
      : this.settings.paths.rootPackage;
    // this.parent = this.isRoot ? this : this.Class.create(path.dirname(dirname));
  }

  get parent() {
    return this.getParentPackage();
  }

  getCatalogDirs() {
    return Array.from(this.settings.catalogs);
  }

  exists(...args) {
    let filename = path.resolve(this.dirname, ...args);
    return fs.existsSync(filename);
  }

  getSettings() {
    const filename = path.resolve(process.env.HOME, '.scanner.yaml');
    if (!fs.existsSync(filename)) {
      fs.writeFileSync(filename, xyaml.dump(this.getDefaultSettings()));
    }
    return xyaml.loadFile(filename);
  }

  getDefaultSettings() {
    let homeDir = process.env.HOME,
      workDir = path.resolve(homeDir, 'work');
    return {
      paths: {
        users: path.resolve(homeDir, '..'),
        home: homeDir,
        work: workDir,
        config: path.resolve(workDir, 'config'),
        projects: path.resolve(workDir, 'projects'),
        packages: path.resolve(workDir, 'packages'),
        tools: path.resolve(workDir, 'tools'),
        rootPackage: path.resolve(homeDir, '..'),
      },
      catalogs: [
        path.resolve(workDir, 'packages'),
        path.resolve(workDir, 'projects'),
        path.resolve(workDir, 'tools'),
      ],
    };
  }

  resolve(...paths) {
    if (!this.exists(...paths)) {
      return path.resolve(this.dirname, ...paths);
    }
    return fs.realpathSync(path.resolve(this.dirname, ...paths));
  }

  getConstructor() {
    return this.constructor.getConstructor();
  }

  get Class() {
    return this.constructor.Class;
  }
}

module.exports = Directory;
