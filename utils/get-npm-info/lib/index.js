'use strict';

const semver = require('semver');
const axios = require('axios');
const urlJoin = require('url-join');


function getNpmInfo(npmName, registry) {
    if (!npmName) {
        return null;
    }
    registry = registry || getDefaultRegistry(true);
    const npmInfoUrl = urlJoin(registry, npmName);
    return axios.get(npmInfoUrl).then(res => {
        if (res.status === 200) {
            return res.data;
        }
        return null;
    }).catch(err => Promise.reject(err));
}

function getDefaultRegistry(isOriginal = false) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npmjs.taobao.org'
}

async function getNpmVersions(npmName) {
    // 调用npm API，获取所有的版本号
    const data = await getNpmInfo(npmName);
    if (data) {
        return Object.keys(data.versions);
    }
    return null;
}

function getNpmSemverVersions(baseVersion, versions) {
    // 提取有版本号，比对那些版本号是大于当前版本号
    return versions
        .filter(version => semver.satisfies(version, `^${baseVersion}`))
        .sort((a, b) => semver.gt(b, a));
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry);
    // 比对版本号
    const newVersions = getNpmSemverVersions(baseVersion, versions);
    if (newVersions && newVersions.length) {
        // 返回最新版本号
        return newVersions[0];
    }
}

async function getNpmLatestVersion(npmName, registry) {
    let versions = await getNpmVersions(npmName, registry);
    if (versions) {
        return versions.sort((a, b) => semver.gt(b, a)?1:-1)[0];
    }
    return null;
}

module.exports = {
    getNpmInfo, getNpmVersions, getNpmSemverVersion,getDefaultRegistry,getNpmLatestVersion
};

