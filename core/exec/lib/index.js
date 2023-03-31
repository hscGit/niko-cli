'use strict';

const path = require('path');
const cp = require('child_process');
const Package = require('@niko-cli/package');
const log = require('@niko-cli/log');
const {exec: spawn} = require('@niko-cli/utils');

module.exports = exec;

const SETTINGS = {
    init: '@niko-cli/init'
}
const CACHE_DIR = 'dependencies';

async function exec(...args) {
    let targetPath = process.env.CLI_TARGET_PATH;
    let storeDir = '';
    let pkg;
    const homePath = process.env.CLI_HOME_PATH;
    log.verbose('targetPath', targetPath);
    log.verbose('homePath', homePath);

    const cmdName = args[args.length - 1].name()
    const packageName = SETTINGS[cmdName]
    const packageVersion = 'latest'

    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
        storeDir = path.resolve(targetPath, 'node_modules');
        log.verbose('targetPath', targetPath);
        log.verbose('storeDir', storeDir);
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion
        });
        if (pkg.exists()) {
            await pkg.update()
        } else {
            await pkg.install()
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion
        });
        const rootFile = pkg.getRootFilePath();
        if (rootFile) {
            try {
                // require(rootFile).call(null, Array.from(args));
                let argv = Array.from(args);
                const cmd = argv[argv.length - 1];
                const o = Object.create(null);
                Object.keys(cmd).forEach(key=>{
                    if (cmd.hasOwnProperty(key) && !key.startsWith('_')&&key !== 'parent') {
                        o[key] = cmd[key];
                    }
                })
                argv[argv.length - 1] = o;
                let code = `require('${rootFile}').call(null, ${JSON.stringify(argv)})`;
                const child = spawn('node', ['-e', code], {
                    cwd: process.cwd(),
                    stdio: 'inherit'
                })
                child.on('error', err => {
                    log.error(err.message);
                    process.exit(1);
                })
                child.on('exit', e => {
                    log.verbose('命令执行成功：' + e);
                    process.exit(e);
                })
            } catch (error) {
                log.error(error.message);
            }
        }
    }
}