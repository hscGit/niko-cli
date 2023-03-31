'use strict';

module.exports = toType;

// 封装数据类型检测方法
function toType(value) {
    let classType = {};
    [
      "Boolean",
      "Number",
      "String",
      "Function",
      "Array",
      "Date",
      "RegExp",
      "Object",
      "Error",
      "Symbol",
    ].forEach((name) => {
      classType[`[object ${name}]`] = name.toLowerCase();
    });
  
    // 传递的值如果是null或者undefined，就返回对应的字符串
    if (value == null) {
      return value + "";
    }
    // 基本数据类型都采用typeof检测
    return typeof value === "object" || typeof value === "function"
      ? classType[Object.prototype.toString.call(value)] || "object"
      : typeof value;
  }
