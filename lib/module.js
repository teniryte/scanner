/* eslint-disable */
// @ts-nocheck

const _ = require('ooi');
const fs = require('fs');
const xyaml = require('xyaml');
const path = require('path');
const semver = require('semver');
const rimraf = require('rimraf');

const Files = require('./files');
const Yarn = require('./yarn');

class Module extends Files {
  constructor(...args) {
    super(...args);
    this.yarn = new Yarn(this.dirname, {});
  }

  removeDevDeps() {
    let deps = this.getDevelopingDependencies(),
      data = this.getPackage(),
      names = Object.keys(deps);
    names.forEach(name => delete data.dependencies[name]);
    this.setPackage(data);
  }

  applyDevDeps() {
    let deps = this.getDevelopingDependencies(),
      data = this.getPackage(),
      names = Object.keys(deps);
    data.dependencies = {
      ...data.dependencies,
      ...deps,
    };
    this.setPackage(data);
    names.forEach(name => {
      rimraf.sync(this.resolve('node_modules', name));
    });
  }

  async add(name) {
    await this.yarn.add(name);
    return this.getLocalPackage(name.split('@')[0]);
  }

  async remove(name) {
    await this.yarn.add(name);
    return this;
  }

  require(p = '') {
    return require(`${this.dirname}${p ? `/${p}` : ''}`);
  }
}

module.exports = Module;
