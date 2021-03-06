const xlsx = require('node-xlsx').default
const set = require('lodash.set')
const fs = require('fs')
const path = require('path')
const os = require('os')

const jsonToData = (str) => {
    let codeArr = str.split(os.EOL)
    for(let i = 0; i < codeArr.length; i++) {
        codeArr[i] = codeArr[i].replace(/ /g, '').replace(/\ +/g,"").replace(/[\r\n]/g,"")
        if(codeArr[i].indexOf('//') === 0){
            codeArr.splice(i, 1)
            i--
        }
    }

    let s = codeArr.join("");
    let json;
    try {
      json = JSON.parse(s);
    } catch (e) {
      const obj = eval("(" + s + ")");
      json = JSON.parse(JSON.stringify(obj));
    }

    return json
}

const arrayToObject = (array) => {
    let obj = {}
    array.forEach(item => {
        set(obj, item[0], item[item.length - 1])
        // let keyArr = item[0].split('.')
        // if(!obj[keyArr[0]]) {
        //     obj[keyArr[0]] = {}
        // }
        // obj[keyArr[i]][keyArr[1]] = item[item.length - 1]
    });
    return obj
}

const toExcel = (url, translateUrl, filename, cb) => {
    let traJson, traCode
    const code = fs.readFileSync(path.join(process.cwd(), url.replace('/', path.sep)), 'utf-8')
    const json = jsonToData(code.slice(code.indexOf('{'), code.lastIndexOf('}') + 1).replace(/\'/g, '"'))
    if(translateUrl) {
        traCode = fs.readFileSync(path.join(process.cwd(), translateUrl.replace('/', path.sep)), 'utf-8')
        traJson = jsonToData(traCode.slice(traCode.indexOf('{'), traCode.lastIndexOf('}') + 1).replace(/\'/g, '"'))
    }
    let title = ['key', '简体中文', '<Translate>']
    let data = [title]
    for(let key in json) {
        for(let lkey in json[key]){
            if(typeof json[key][lkey] === 'string') {
                if(translateUrl && traJson[key] && traJson[key][lkey]){
                    data.push([`${key}.${lkey}`, json[key][lkey], traJson[key][lkey]])    
                } else {
                    data.push([`${key}.${lkey}`, json[key][lkey]])
                }
            }
            
            if(typeof json[key][lkey] === 'object') {
                for(let lkey2 in json[key][lkey]){
                    if(translateUrl && traJson[key] && traJson[key][lkey] && traJson[key][lkey][lkey2]){
                        data.push([`${key}.${lkey}.${lkey2}`, json[key][lkey][lkey2], traJson[key][lkey][lkey2]])    
                    } else {
                        data.push([`${key}.${lkey}.${lkey2}`, json[key][lkey][lkey2]])
                    }
                }
            }
        }
    }
    let buffer = xlsx.build([{name: '简体中文', data}])
    fs.writeFile(path.join(process.cwd(), filename),buffer,{'flag':'w'}, cb)
}

const tojs = (url, filename, cb)  => {
    let jsonCode, jsonArr, code
    try {
        let res = fs.readFileSync(process.cwd() + url.replace('/', path.sep))
        const data = xlsx.parse(res)[0].data // 第一个sheet
        data.shift() // 去除第一行，第一行是标题
        const jsonData = arrayToObject(data)
        jsonCode = JSON.stringify(jsonData).replace(/\{\"/g, '{\n\"').replace(/\"\}/g, '\"\n}').replace(/\,\"/g, ',\n\"').replace(/\:/g, ': ').replace(/\"/g, '\'').replace(/\}\}/g, '}\n}')
        jsonArr = jsonCode.split('\n')
        const len = jsonArr.length
        let count = 0
        for(let i = 0; i < len; i++) {
            let count_bak = count
            if(jsonArr[i].indexOf('}') === 0 && count > 0) {
                count_bak -= 1
            }
            for(let j = 0; j < count_bak; j ++) {
                jsonArr[i] = '  ' + jsonArr[i]
            }
            let len1 = jsonArr[i].replace(/[^\{]/g, '').length
            let len2 = jsonArr[i].replace(/[^\}]/g, '').length
            count = count + len1 - len2
        }
        code = `export default ${jsonArr.join(os.EOL)}\n`
        fs.access(process.cwd() + filename, fs.constants.F_OK, (err) => {
            if(!err) {
                fs.unlinkSync(process.cwd() + filename)
            }
            fs.writeFile(path.join(process.cwd(), filename), code,{'flag':'w'}, cb)
        })
    } catch (err) {
        // 出错了
        cb(err)
    }
}

module.exports = {
    toExcel,
    tojs 
}
