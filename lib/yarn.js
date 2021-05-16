'use strict';

const child_process = require('child_process');
const path = require('path');

class Yarn {
  constructor(cwd = process.cwd(), config) {
    this.cwd = cwd;
    this.config = config;
    this.bin = path.resolve(__dirname, '../node_modules/.bin/yarn');
  }

  async add(name) {
    console.log(`Yarn: add «${name}» to «${this.cwd}»...`);
    await this.exec(`${this.bin} add ${name}`, this.cwd, this.config);
    console.log(`Yarn: «${name}» added!.`);
  }

  async remove(name, cwd = process.cwd(), config = {}) {
    return await this.exec(`${this.bin} remove ${name}`, this.cwd, this.config);
  }

  exec(code = '') {
    let cwd = this.cwd,
      config = this.config,
      command = code.split(' ')[0],
      args = code.split(' ').slice(1);
    return new Promise((resolve, reject) => {
      let process = child_process.spawn(command, args, { cwd }),
        success = '',
        error = '';

      process.stdout.on('data', data => {
        if (config.onData) config.onData(data);
        success += data;
      });

      process.stderr.on('data', data => {
        if (config.onError) config.onError(data);
        error += data;
      });

      process.on('close', code => {
        if (config.onClose) config.onClose(code);
        if (code === 0) {
          return resolve(success);
        }
        reject(error);
      });
    });
  }
}

module.exports = Yarn;
