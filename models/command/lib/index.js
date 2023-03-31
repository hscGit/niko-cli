'use strict';

const semver = require('semver');
const colors = require('colors');
const log = require('@niko-cli/log');
const toType = require('@niko-cli/to-type');

const LOWEST_NODE_VERSION = '18.0.0';

class Command {
    constructor(argv) {
        if (!argv) {
            throw new Error('参数不能为空！');
        }
        if (toType(argv) !== 'array') {
            throw new Error('参数必须为数组！');
        }
        if (argv.length < 1) {
            throw new Error('参数列表为空！');
        }
        this._argv = argv;

        const runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch(err => {
                log.error(err.message);
            })
        })
    }

    initArgs() {
        this._cmd = this._argv[this._argv.length - 1];
        this._argv = this._argv.slice(0, this._argv.length - 1);
    }

    checkNodeVersion() {
        // 获取当前node版本号
        const currentVersion = process.version;
        // 最低node版本
        const lowestVersion = LOWEST_NODE_VERSION
        // 比对最低node版本号
        if (!semver.gte(currentVersion, lowestVersion)) {
            throw new Error(colors.red(`niko-cli 需要安装 v${lowestVersion} 以上的nodeJs版本`))
        }
    }

    init() {
        throw new Error('init必须实现！');
    }

    exec() {
        throw new Error('exec必须实现！');
    }
}

module.exports = Command;
