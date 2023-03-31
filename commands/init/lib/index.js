'use strict';

const path = require('path');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const userHome = require('user-home');
const semver = require('semver')
const globSync = require('glob').globSync;
const ejs = require('ejs');
const Command = require('@niko-cli/command');
const Package = require('@niko-cli/package');
const log = require('@niko-cli/log');
const getProjectTemplate = require('./getProjectTemplate');
const { spinner, sleep, execAsync } = require('@niko-cli/utils');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';
const WHITE_COMMAND = ['npm', 'cnpm', 'yarn'];

class InitCommand extends Command {
    constructor(argv) {
        super(argv)
    }

    init() {
        this.projectName = this._argv[0];
        this.force = !!this._argv[1].force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }

    async exec() {
        try {
            // 1. 准备阶段
            const projectInfo = await this.prepare()
            this.projectInfo = projectInfo;
            log.verbose('projectInfo', projectInfo);
            if (projectInfo) {
                // 2. 下载模版
                await this.dowmloadTemplate()
                // 3. 安装模版
                await this.installTemplate()
            }

        } catch (error) {
            console.log(error.message);
        }
    }

    async prepare() {
        const template = await getProjectTemplate();
        if (!template || template.length === 0) {
            throw new Error('当前没有可用的项目模版');
        }
        this.template = template;
        const localPath = process.cwd();
        // 1. 判断当前目录是否为空
        if (!this.ifDirIsEmpty(localPath)) {
            let ifContinue = false;
            if (!this.force) {
                // 是否启动强制更新
                ifContinue = (await inquirer.prompt([
                    { type: 'confirm', name: 'ifContinue', default: false, message: '当前文件夹不为空，是否继续创建？' }
                ])).ifContinue;
                if (!ifContinue) return;
            }
            // 2. 是否强制更新
            if (ifContinue || this.force) {
                // 二次确认
                const { confirmDelete } = await inquirer.prompt([
                    { type: 'confirm', name: 'confirmDelete', default: false, message: '是否清空当前文件夹下的所有文件？' }
                ])
                if (confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath);
                }
            }
        }
        return this.getProjectInfo();
    }

    ifDirIsEmpty(localPath) {
        const fileList = fs.readdirSync(localPath).filter(file => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0);
        return !fileList || fileList.length <= 0;
    }

    async getProjectInfo() {
        let projectInfo = {};
        const projectName = this.projectName;
        let type = '';
        // 3. 选择创建项目或组建
        type = (await inquirer.prompt([
            {
                type: 'list', name: 'type', message: '请选择初始化类型', default: TYPE_PROJECT, choices: [
                    { name: '项目', value: TYPE_PROJECT },
                    // { name: '组件', value: TYPE_COMPONENT },
                ]
            }
        ])).type;
        log.verbose('type', type);
        const title = type === TYPE_PROJECT ? '项目' : '组件';
        let prompt = [
            {
                type: 'input',
                message: `请输入${title}名称`,
                name: 'projectName',
                default: projectName,
                validte: function (v) {
                    // 1. 输入的首字符必须为英文字符
                    // 2. 尾字符必须为英文字符或数字
                    // 3. 字符仅允许“-_”
                    const done = this.async();

                    setTimeout(function () {
                        if (!(/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/).test(v)) {
                            done('请输入合法的项目名称，首字符必须为英文字符，尾字符必须为英文字符或数字，字符仅允许“-_”');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
                filter: function (v) {
                    return v;
                }
            },
            {
                type: 'input',
                message: `请输入${title}版本号`,
                name: 'projectVersion',
                default: '1.0.0',
                validte: function (v) {
                    const done = this.async();

                    setTimeout(function () {
                        if (!semver.valid(v)) {
                            done('请输入合法的版本号');
                            return;
                        }
                        done(null, true);
                    }, 0);
                },
                filter: function (v) {
                    if (!!semver.valid(v)) {
                        return semver.valid(v);
                    } else {
                        return v;
                    }
                }
            },
            {
                type: 'list',
                message: `请选择${title}模版`,
                name: 'projectTemplate',
                choices: this.getTemplateChoices(type)
            }
        ]
        if (type === TYPE_PROJECT) {
            // 4. 获取项目基本信息
            const project = await inquirer.prompt(prompt);
            projectInfo = {
                type,
                ...project
            };
        } else if (type === TYPE_COMPONENT) {
            const descriptionPrompt = {
                type: 'input',
                message: '请输入组件描述信息',
                name: 'componentDescription',
                default: '',
                validte: function (v) {
                    const done = this.async();

                    setTimeout(function () {
                        if (!v) {
                            done('请输入组件描述信息');
                            return;
                        }
                        done(null, true);
                    }, 0);
                }
            }
            prompt.push(descriptionPrompt);
            const component = await inquirer.prompt(prompt);
            projectInfo = {
                type,
                ...component
            };
        }
        if (projectInfo.projectName) {
            projectInfo.projectName = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
        } 
        return projectInfo;
    }

    async dowmloadTemplate() {
        // 1. 通过项目模版API获取模版信息
        const { projectTemplate } = this.projectInfo;
        const templateInfo = this.template.find(item => item.npmName === projectTemplate);
        this.templateInfo = templateInfo;
        const { npmName, version } = templateInfo;
        const targetPath = path.resolve(userHome, '.niko-cli', 'template');
        const targetDir = path.resolve(userHome, '.niko-cli', 'template', 'node_modules');
        const templateNpm = new Package({
            targetPath, storeDir: targetDir, packageName: npmName, packageVersion: version
        })
        const spinners = spinner();
        if (!await templateNpm.exists()) {
            spinners.start('正在下载模版...');
            await sleep();
            try {
                await templateNpm.install();
                spinners.succeed('模版下载成功！');
                this.templateNpm = templateNpm;
            } catch (error) {
                spinners.fail('模版下载失败');
                log.error(error)
            }
        } else {
            spinners.start('正在更新模版...');
            await sleep();
            try {
                await templateNpm.update();
                spinners.succeed('模版更新成功！');
                this.templateNpm = templateNpm;
            } catch (error) {
                spinners.fail('模版更新失败');
                log.error(error)
            }
        }
        spinners.stop();
    }

    async installTemplate() {
        if (this.templateInfo) {
            const { type } = this.templateInfo;
            if (!type) {
                this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
            }
            if (type === TEMPLATE_TYPE_NORMAL) {
                await this.installNormalTemplate();
            } else if (type === TEMPLATE_TYPE_CUSTOM) {
                await this.installCustomTemplate();
            } else {
                throw new Error('无效的项目模版类型！');
            }
        } else {
            throw new Error('项目模版信息不存在！');
        }
    }

    checkCommand(cmd) {
        if (WHITE_COMMAND.includes(cmd)) {
            return cmd;
        }
        return null;
    }

    ejsRender(options) {
        const dir = process.cwd();
        const projectInfo = this.projectInfo;
        return new Promise((resolve, reject) => {
            const files = globSync('**', {
                cwd: dir,
                ignore: options.ignore || '',
                nodir: true
            })
            Promise.all(files.map(file => {
                const filePath = path.join(dir, file);
                return new Promise((res, rej) => {
                    ejs.renderFile(filePath, projectInfo, {}, function (err, str) {
                        if (err) {
                            rej(err)
                        }
                        fse.writeFileSync(filePath, str);
                        res()
                    })
                })
            })).then(() => {
                resolve()
            }).catch(err => {
                reject(err)
            })
        })
    }

    async installNormalTemplate() {
        const { installCommand, startCommand, ignore } = this.templateInfo;
        log.verbose('storeDir', this.templateNpm.storeDir);
        log.verbose('npmName', this.templateInfo.npmName);
        // 1. 拷贝缓存的模版到当前文件夹
        const spinners = spinner();
        spinners.start('正在安装模版...');
        await sleep();
        try {
            const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
            const targetPath = process.cwd();
            fse.ensureDirSync(templatePath);
            fse.ensureDirSync(targetPath);
            fse.copySync(templatePath, targetPath);
            spinners.succeed('模版安装成功！')
        } catch (error) {
            spinners.fail('模版安装失败！');
            throw error;
        } finally { }
        const options = {
            ignore: ignore || []
        }
        await this.ejsRender(options);
        spinners.warn('正在安装依赖...');
        // 2. 下载依赖
        if (installCommand) {
            const installCmd = installCommand.split(' ');
            const cmd = this.checkCommand(installCmd[0]);
            if (!cmd) {
                throw new Error('无效或不允许执行的命令：' + installCmd);
            }
            const args = installCmd.slice(1);
            let installRet = await execAsync(cmd, args, {
                cwd: process.cwd(),
                stdio: 'inherit'
            })
            if (installRet !== 0) {
                spinners.fail('依赖安装失败');
            }
            console.log();
            await sleep();
            spinners.succeed('依赖安装成功！');
            console.log();
            spinners.succeed(`请在当前目录下打开终端，输入 \`${startCommand}\` 启动项目!`);
            console.log();
        }
        spinners.stop()
    }

    async installCustomTemplate() { }

    getTemplateChoices(type) {
        return this.template.filter(template=>template.tag.includes(type)).map(item => ({ value: item.npmName, name: item.name }));
    }
}

function init(argv) {
    return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;