'use strict';

const _ = require('ooi');
const path = require('path');
const fs = require('fs');
const xyaml = require('xyaml');

const Package = require('./package');

const settings = getSettings();
const packs = getPackages();

async function localize() {
  let paths = _.keys(packs);
  for (let i = 0; i < paths.length; i++) {
    let path = paths[i],
      pack = packs[path];
    console.log(`Setting up «${pack.name}» package...`);
    await pack.buildDeps();
    console.log('Done!');
  }
}

module.exports = () => {
  return localize();
};

function getPackages() {
  let packs = {};
  settings.wire.packages.forEach(dirname => {
    if (!fs.existsSync(dirname)) return;
    packs[dirname] = new Package(dirname);
  });
  return packs;
}

function getSettings() {
  return xyaml.loadFile(path.resolve(process.env.HOME, '.scanner.yaml'));
}
