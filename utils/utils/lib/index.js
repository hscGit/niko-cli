'use strict';

function spinner(opts) {
    const options = opts || {
        text: '',
        prefixText: ''
    };
    const ora = require('ora')(options);
    return ora;
}
/** 
* @author hscer 2023/03/08
* @version 1.0.0
* @param {Number} timeout 输入一个时间戳，控制睡眠时长
* @return {Promise}
* @example sleep(1000)
 */
async function sleep(timeout=1000) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}

function exec(command, args, options) {
    // 判断不同系统，兼容windows
    const win32 = process.platform === 'win32';
    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;
    return require('child_process').spawn(cmd, cmdArgs, options || {});
}

function execAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const e = exec(command, args, options);
        e.on('error', (err) => reject(err));
        e.on('exit', (status) => resolve(status));
    })
}


module.exports = {
    spinner,
    sleep,
    exec,
    execAsync
};
