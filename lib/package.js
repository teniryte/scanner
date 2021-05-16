/* eslint-disable */
// @ts-nocheck

const _ = require('ooi');
const fs = require('fs');
const xyaml = require('xyaml');
const path = require('path');
const semver = require('semver');
const rimraf = require('rimraf');

const Module = require('./module');
const state = {};

class Package extends Module {
  static getRoot() {
    if (state.root) return state.root;
    state.root = this.Class.create();
    return state.root;
  }

  // Getters ===================================================================

  get root() {
    return this.Class.getRoot();
  }

  get name() {
    return this.getPackage().name || path.basename(this.dirname);
  }

  get version() {
    return semver.valid(this.getPackage().version);
  }

  get main() {
    return this.getMain();
  }

  get filename() {
    return this.resolveModule(this.name);
  }

  toJSON() {
    return {
      name: this.name,
      version: this.version,
      main: this.main,
      filename: this.filename,
      dirname: this.dirname,
      isPackage: this.isPackage(),
    };
  }

  // Dependencies ==============================================================

  async buildDeps() {
    let deps = this.getPackage().deps;
    for (let i = 0; i < deps.length; i++) {
      let dep = deps[i],
        moduleFilename = this.resolveNodePackage(dep);
      if (moduleFilename) continue;
      await this.yarn.add(dep);
      moduleFilename = this.resolveNodePackage(dep);
      console.log('INSTALLED', moduleFilename);
    }
    // await this.fixResolvedDeps();
    // await this.clearAllDependencies();
    // await this.installUnresolvedDependencies();
    // this.fixDepsVersions();
    // this.fixDependenciesVersions();
  }

  async clearAllDependencies() {
    let data = this.getPackage();
    rimraf.sync(this.resolve('node_modules'));
    data.dependencies = {};
    data.devDependencies = {};
    this.setPackage(data);
    this.clearDepsVersions();
  }

  getActualDependencies() {
    let deps = {},
      dependencies = this.getPackage().dependencies;
    this.getPackage().deps.forEach(dep => {
      let [depName, depVersion] = [dep.split('@')[0], dep.split('@')[1] || '*'],
        nodeModule = this.resolveNodePackage(depName),
        pack = this.Class.create(nodeModule);
      deps[depName] = {
        name: depName,
        version: depVersion,
        type: pack,
        packVersion: pack.version,
        package: pack,
      };
    });
    return deps;
  }

  fixDependenciesVersions() {
    let deps = this.getActualDependencies(),
      data = this.getPackage(),
      dependencies = _.flatten(data.dependencies),
      newDependencies = {};
    _.each(dependencies, (v, name) => {
      let dep = deps[name],
        version = '^' + dep.package.version;
      newDependencies[name] = version;
    });
    data.dependencies = newDependencies;
    this.setPackage(data);
  }

  fixDepsVersions() {
    let actualDeps = this.getActualDependencies(),
      data = this.getPackage(),
      deps = data.deps,
      newDeps = [];
    _.each(deps, name => {
      let depName = name.split('@')[0];
      if (actualDeps[depName].regular) {
        newDeps.push(name);
        return;
      }
      let actualDep = actualDeps[depName],
        version = '^' + actualDep.package.version;
      newDeps.push(`${depName}@${version}`);
    });
    data.deps = newDeps;
    this.setPackage(data);
  }

  clearDepsVersions() {
    let data = this.getPackage(),
      deps = data.deps;
    data.deps = deps.map(dep => dep.split('@')[0]);
    this.setPackage(data);
  }

  async installUnresolvedDependencies() {
    let deps = this.getActualDependencies(),
      names = _.keys(deps);
    for (let i = 0; i < names.length; i++) {
      let dep = deps[names[i]];
      if (dep.packVersion) continue;
      await this.yarn.add(`${dep.name}@${dep.version}`);
    }
  }

  getLocalPackage(name) {
    if (!this.exists('node_modules', name)) return null;
    let dir = this.resolve('node_modules', name);
    return new this.Class(dir, this);
  }

  getDependencies() {
    return this.parseDependencies(this.getPackage().dependencies || {});
  }

  getDevDependencies() {
    return this.parseDependencies(this.getPackage().devDependencies || {});
  }

  getAllDependencies(...args) {
    return {
      ...this.getDependencies(...args),
      ...this.getDevDependencies(...args),
    };
  }

  getDependencyVersion(name) {
    let data = this.getPackage();
    return (
      (data.dependencies || {})[name] || (data.devDependencies || {})[name]
    );
  }

  getDeps(...args) {
    return this.getDependencies(...args);
  }

  getDevDeps(...args) {
    return this.getDevDependencies(...args);
  }

  getAllDeps(...args) {
    return this.getAllDependencies(...args);
  }

  getDepVersion(...args) {
    return this.getDependencyVersion(...args);
  }

  parseDependencies(dependencies = {}) {
    let deps = {};
    _.each(dependencies, (version, name) => {
      let pack = this.Class.create(this.resolvePackage(name), this);
      deps[name] = pack;
    });
    return deps;
  }

  // Resolves ==================================================================

  getParentPackage() {
    let packages = this.getPackages(),
      pack = packages.pop();
    while (pack) {
      let depVersion = pack.getDepVersion(this.name);
      console.log('PACK', pack.dirname, depVersion);
      if (depVersion) {
        if (this.isVersionCorrect(depVersion)) return pack;
      }
      pack = packages.pop();
    }
    return this.root;
  }

  isPackage() {
    return this.exists('package.json');
  }

  getLocalModules() {
    return this.getFiles('node_modules').map(file =>
      this.Class.create(this.resolve('node_modules', file), this)
    );
  }

  getPackages() {
    let parentDir = this.dirname,
      packages = [],
      parentPackage = this.root;
    while (parentDir !== '/') {
      parentDir = path.dirname(parentDir);
      let packageFilename = path.resolve(parentDir, 'package.json'),
        isPackage = fs.existsSync(packageFilename);
      if (!isPackage) continue;
      packages.unshift(this.Class.create(parentDir));
    }
    packages.forEach(pack => {
      pack.getParent = () => {
        return parentPackage;
      };
      parentPackage = pack;
    });
    return packages;
  }

  resolveNodePackage(name) {
    let paths = this.getNodePaths();
    while (paths.length) {
      let nodePath = paths.shift(),
        modulePath = path.resolve(nodePath, name);
      if (
        !fs.existsSync(modulePath) ||
        !fs.statSync(modulePath).isDirectory()
      ) {
        continue;
      }
      return modulePath;
    }
    return null;
  }

  getNodePaths() {
    let parent = this.dirname,
      paths = [];
    while (parent !== '/') {
      let nodePath = path.resolve(parent, 'node_modules');
      parent = path.dirname(parent);
      if (!fs.existsSync(nodePath)) continue;
      paths.push(nodePath);
    }
    return paths;
  }

  getMain() {
    let data = this.getPackage(),
      filename = this.resolve(data.main || 'index.js');
    return filename;
  }

  resolveModule(name) {
    return this.resolve(this.getPackage().main || 'index.js');
  }

  resolvePackage(name) {
    let filename = this.resolveModule(name);
    while (
      !fs.existsSync(path.resolve(filename, 'package.json')) &&
      filename !== '/'
    ) {
      filename = path.dirname(filename);
    }
    return filename;
  }

  // Package content ===========================================================

  getDevelopingDependencies() {
    let packages = this.getDevelopingPackages(),
      deps = {};
    packages.forEach(pack => {
      deps[pack.name] = `^${pack.version}`;
    });
    return deps;
  }

  getDevelopingPackages() {
    let names = this.getPackage().developing || [],
      packages = names
        .map(name => this.resolveNodePackage(name))
        .map(dir => this.Class.create(dir));
    return packages;
  }

  getPackage() {
    if (!this.isPackage()) return {};
    return JSON.parse(fs.readFileSync(this.resolve('package.json'), 'utf-8'));
  }

  setPackage(data) {
    let filename = this.resolve('package.json');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    return this;
  }

  updatePackage(key, value) {
    let data = this.getPackage(),
      currentValue = _.deepClone(_.get(data, key)),
      nextValue = _.deepClone(
        typeof value === 'function' ? value(currentValue) : value
      );
    _.set(data, key, nextValue);
    this.setPackage(data);
    return this;
  }

  // Version ===================================================================

  isVersionCorrect(required) {
    return semver.satisfies(this.version, required);
  }

  getVersion() {
    let pack = this.getPackage(),
      version = pack.version;
    return version.split('.').map(num => +num);
  }

  setVersion(version) {
    let stringVersion = version.join('.');
    this.updatePackage('version', version => {
      return stringVersion;
    });
    return this;
  }

  updateVersion(...args) {
    let version = this.getVersion(),
      newVersion = version.map((v, i) => v + args[i] || 0);
    this.setVersion(newVersion);
  }
}

module.exports = Package;
