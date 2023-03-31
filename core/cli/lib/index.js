'use strict';

module.exports = core;

const path = require('path');
const colors = require('colors/safe');
const semver = require('semver');
const userHome = require('user-home');
const pathExistsSync = require('path-exists').sync;
const commander = require('commander');

const exec = require('@niko-cli/exec');
const log = require('@niko-cli/log');
const pkg = require('../package.json');
const constant = require('./const');

let program = new commander.Command()

async function core() {
    try {
        await prepare()
        registerCommand()
    } catch (error) {
        log.error(error.message)
        if (process.env.LOG_LERVEL === 'verbose') {
            console.log(error);
        }
    }
}

async function prepare() {
    checkPkgVersion()
    checkRoot()
    checkUserHome()
    checkEnv()
    await checkGlobalUpdate()
}

function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地调试路径', '');

    program
        .command('init [projectName]')
        .option('-f, --force', '是否强制初始化项目', false)
        .description('项目初始化')
        .action(exec);

    // 监听debug模式
    program.on('option:debug', function() {
        if (this.opts().debug) {
            process.env.LOG_LERVEL = 'verbose';
        } else {
            process.env.LOG_LERVEL = 'info';
        }
        log.level = process.env.LOG_LERVEL;
    })

    // 监听缓存目标路径
    program.on('option:targetPath', function() {
        // 将目标路径存到环境变量中
        process.env.CLI_TARGET_PATH = this.opts().targetPath;
    })

    // 对未知命令监听
    program.on('command:*', function(obj) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        console.log(colors.red('未知命令：' + obj[0]));
        if (availableCommands.length > 0) {
            console.log(colors.red('可用命令：' + availableCommands.join(',')));
        }
    })

    // 解析参数
    program.parse(process.argv)
}

async function checkGlobalUpdate() {
    // 1.获取当前版本号和模块名
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    const {
        getNpmSemverVersion
    } = require('@niko-cli/get-npm-info');
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        // 提示用户更新到该版本
        log.warn('更新提示', colors.yellow(`请手动更新${npmName},当前版本${currentVersion},最新版本${lastVersion},更新命令：npm install -g ${npmName}`))
    }
}

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    if (pathExistsSync(dotenvPath)) {
        dotenv.config({
            path: dotenvPath
        })
    }
    createDefaultConfig()
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

function checkRoot() {
    const rootCheck = require('root-check');
    rootCheck();
}

function checkUserHome() {
    if (!userHome || !pathExistsSync(userHome)) {
        throw new Error(colors.red('当前用户住目录不存在！'))
    }
}

function checkPkgVersion() {
    log.notice('cli', pkg.version);
}