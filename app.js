'use strict';

const scanner = require('./lib');

let p = scanner.Package.create('/home/teniryte/work/packages/ooi');

global.p = p;
global.s = scanner;
global.i = p.getLocalPackage('is-array');
global.o = i.getLocalPackage('ooi');

async function run() {
  // let response = await scanner.yarn.add(
  //   'is-array',
  //   '/home/teniryte/work/packages/ooi'
  // );
  // console.log('RESPONSE', response);
}

run()
  .then(res => console.log('DONE'))
  .catch(err => console.log('ERROR', err));
