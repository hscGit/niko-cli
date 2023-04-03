'use strict';

const path = require('path');
const pkgDir = require('pkg-dir').sync;
const npminstall = require('npminstall');
const pathExistsSync = require('path-exists').sync;
const fse = require('fs-extra');

const toType = require('@niko-cli/to-type');
const formatPath = require('@niko-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@niko-cli/get-npm-info');

class Package {
    constructor(options) {
        if (!options) {
            throw new Error('Package类的options属性不能为空！');
        }
        if (!toType(options) === 'object') {
            throw new Error('Package类的options属性必须为对象！');
        }
        // package的路径
        this.targetPath = options.targetPath;
        // package的路径
        this.storeDir = options.storeDir;
        // package的name
        this.packageName = options.packageName;
        // package的version
        this.packageVersion = options.packageVersion;
        // package的缓存目录前缀
        this.cacheFilePathPrefix = this.packageName.replace('/', '+');
    }

    async prepare() {
        if (this.storeDir && !pathExistsSync(this.storeDir)) {
            fse.mkdirpSync(this.storeDir);
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName);
        }
    }

    get cacheFilePath() {
        return path.resolve(this.storeDir, '.store', `${this.cacheFilePathPrefix}@${this.packageVersion}`, 'node_modules', this.packageName);
    }

    getSpecificCacheFilePath(packageVersion) {
        return path.resolve(this.storeDir, '.store', `${this.cacheFilePathPrefix}@${packageVersion}`, 'node_modules', this.packageName);
    }

    // 判断当前Package是否存在
    async exists() { 
        if (this.storeDir) {
            await this.prepare();
            return pathExistsSync(this.cacheFilePath);
        } else {
            return pathExistsSync(this.targetPath);
        }
    }

    // 安装Package
    async install() {
        await this.prepare()
        await npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(true),
            pkgs: [{
                name: this.packageName,
                version: this.packageVersion
            }]
        })
    }

    // 更新Package
    async update() {
        await this.prepare()
        // 1.获取最新npm模块版本号
        const latestPackageVersion = await getNpmLatestVersion(this.packageName);
        // 2.查新最新版本号对应的路径是否存在
        const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
        // 3.如果不存在，则直接安装最新版本
        if (!pathExistsSync(latestFilePath)) {
            await npminstall({
                root: this.targetPath,
                storeDir: this.storeDir,
                registry: getDefaultRegistry(true),
                pkgs: [{
                    name: this.packageName,
                    version: latestPackageVersion
                }]
            })
        }
        this.packageVersion = latestPackageVersion;
     }

    // 获取入口文件的路径
    getRootFilePath() {
        function _getRootFIle(targetPath) {
            // 1. 获取package.json所在的目录
            const dir = pkgDir(targetPath);
            if (dir) {
                // 2. 读取package.json
                const pkgFile = require(path.resolve(dir, 'package.json'));
             // 3. 找到mian输出位路径
             if (pkgFile && pkgFile.main) {
                 // 4. 做操作不同系统的路径的兼容
                 return formatPath(path.resolve(dir, pkgFile.main));
             }
         }
         return null
        }
       if (this.storeDir) {
        return _getRootFIle(this.cacheFilePath);
       } else {
        return _getRootFIle(this.targetPath);
       }
    }
}

module.exports = Package;