import { Helper } from "./helper";

export class MenuCleaner {



  static needClean(restaurant) {
    let { menus } = restaurant;

    for (let i = 0; i < (menus || []).length; i++) {
      for (let j = 0; j < (menus[i].mcs || []).length; j++) {
        for (let k = 0; k < (menus[i].mcs[j].mis || []).length; k++) {
          if (this.detectNumber(menus[i].mcs[j].mis[k])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  static extractMenuItemNumber(mc) {
    if (!mc.mis) {
      return;
    }
    let numbers = [], names = [], len = mc.mis.length, repeatNums = [];
    for (let i = 0; i < len; i++) {
      let mi = mc.mis[i];
      if (!mi.name || mi.number) {
        return;
      }
      let [num, ...rest] = mi.name.split('.');
      // remove pure name's prefix ) or . or -
      let name = Helper.shrink(rest.join('.').replace(/^\s*[-).]\s*/, ''));
      num = Helper.shrink(num);
      // cases to skip:
      // 1. num or name is empty; eg. Soda, B-A, B-B, Combo 1, Combo 2 etc.
      if (!num || !name) {
        continue;
      }
      // 2. name repeat; eg. 2 Wings, 3 Wings, 4 Wings, etc.
      if (names.some(n => n.toLowerCase() === name.toLowerCase())) {
        continue;
      }
      // 3. num includes 3+ continuous letter eg. Especial 1. Camarofongo, Especial 2. Camarofongo etc.
      if (/[a-z]{3,}/i.test(num)) {
        continue;
      }
      // 4. num contains non-english characters eg. 蛋花汤 S1. Egg Drop Soup, 云吞汤 S2. Wonton Soup etc.
      if (/[^\x00-\xff]/.test(num)) {
        continue;
      }
      // 5. num contains parentheses aka (), as we don't know if the () thing is related to the menu name
      if (/\(.*\)/.test(num)) {
        continue;
      }
      // 6. original name startsWith 805 B.B.+ etc
      if (/^(\d+\s+)*([a-zA-Z]+\.){2,}/.test(mi.name)) {
        continue;
      }
      // 7. original name startsWith 12 oz. etc
      if (/^(\d+\.?)+\s+[a-zA-Z]{2,}\./.test(mi.name)) {
        continue;
      }
      names[i] = name;
      // if or num repeat, we save the repeat num and index for later use
      if (numbers.some(n => n.toLowerCase() === num.toLowerCase())) {
        repeatNums[i] = num;
        continue;
      }
      // if num has (), we should extract the () and set to name
      let [remark] = num.match(/\(.*\)/) || [""];
      if (remark) {
        names[i] = remark + names[i];
      }
      numbers[i] = num;
    }
    // only handle mcs with at least 5 mis
    if (numbers.length < 5) {
      return;
    }
    let confidence = numbers.filter(n => !!n).length / len;
    // calculate exception ratio , skip lower then 0.79 (4 of 5)
    if (Math.ceil(confidence * 100) < 80) {
      return;
    }
    mc.mis.forEach((mi, i) => {
      if (numbers[i] || repeatNums[i]) {
        mi.number = numbers[i] || repeatNums[i];
        mi.name = names[i];
      }
    });
    return {numbers: mc.mis.map((x, i) => numbers[i] || repeatNums[i]), confidence};
  }

  static extractMenuItemNames(name) {
    if (!name) {
      return null;
    }

    // strip ()[]''"" pairs around name
    // remove prefix _-./ suffix -._/
    const strip = str => str.replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)]$/, '$1')
      .replace(/^'(.+)'$/, '$1').replace(/^"(.+)"$/, '$1').replace(/^\s*[_./-]+\s*/, '')
      .replace(/\s*[-._/]+\s*$/, '').replace(/\s+/g, ' ').trim();

    const putBack = (txt, index, tran) => {
      // if tran(en/zh) is empty, we just return the txt
      if (!tran) {
        return strip(txt);
      }
      // we need handle the follow 3 cases:
      // eg. 酸汤 (牛) 面 / 酸汤面 (牛) / (牛) 酸汤面
      let tranIndex = name.indexOf(tran[0]);
      if (tranIndex < index) {
        if (tran.length + tranIndex > index) {
          let chars = tran.split("");
          chars.splice(index - tranIndex, 0, " " + txt + " ");
          return Helper.shrink(chars.join(''));
        }
        return tran + " " + txt;
      } else {
        return txt + " " + tran;
      }
    };
    // remove all () pairs content for more clear extraction, will add them back after match
    let temp = name.replace(/\([^()]+\)/g, '');
    // we capture 非字母文字， 非字母文字 带空格，(括号内非字母文字)，'引号内非字母文字"
    let regex = /\s*[('"]?[^\x00-\xff](\s*([^\x00-\xff]|\d|\/|-|:|\+|;|,|\.|\(|\)|'|")+)*\s*/;
    let re = temp.match(regex), en = temp, zh = '';
    if (re) {
      zh = strip(re[0].trim()).replace(/^\d+\s*/, '').replace(/\s*\d+$/, '');
      en = temp.replace(regex, '').trim().replace(/\s*-$/, '');
    }
    en = strip(en);
    // get all removed () pairs and add back to en/zh accordingly
    for (let match of name.matchAll(/\([^()]+\)/g)) {
      let txt = match[0];
      // if text contains non-en character, we think it's non-en
      if (/[^\x00-\xff]/.test(txt)) {
        zh = putBack(txt, match.index, zh);
      } else {
        en = putBack(txt, match.index, en);
      }
    }
    return zh ? {en, zh} : null;
  }

  static parsePrefixNum(name) {
    // 1) A. XXX; A1. XXX; A 1. XXX A12. XXX; A1 XXX; A12 XXX; AB1 XXX; AB12 XXX; AB12. XXX; AB1. XXX;
    let regex1 = /^(?<to_rm>(?<num>([a-z]?\s?\d*|[a-z]{2}\s?\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 2) 1. XXX; #1. XXX; 1A XXX; 12A XXX; 11B. XXX; 1B. XXX;
    let regex2 = /^(?<to_rm>(?<num>(#?\d+[a-z]{0,2}))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 3) No. 1 XXX; NO. 12 XXX;
    let regex3 = /^(?<to_rm>(?<num>(No\.\s?\d+))\s+)(?<word>\S+)\s*/i;
    // 4) 中文 A1. XXX
    let regex4 = /^(?<zh>[^\x00-\xff]+\s*)(?<to_rm>(?<num>([a-z]{1,2}\s?\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    // 5) (XL) A1. XXX
    let regex5 = /^(?<mark>\(\w+\)\s*)(?<to_rm>(?<num>([a-z]{1,2}\s?\d+))(((?<dot>\.)\s?)|(\s)))(?<word>\S+)\s*/i;
    return [regex1, regex2, regex3, regex4, regex5].reduce((a, c) => a || name.match(c), null);
  }

  static detectNumber(item) {
    let { name } = item;
    // if name is empty or item has number already, skip
    if (!name || !!item.number) {
      return;
    }

    name = name.trim();
    // extract the possible number info from menu's name
    let numMatched = this.parsePrefixNum(name);
    // if name itself has a number, like 3 cups chicken, 4 pcs XXX etc. these will extract the measure word to judge
    let measureWords = [
      'piece', 'pieces', 'pc', 'pcs', 'pc.', 'pcs.', 'cups', 'cup',, 'litre',
      'liter', 'liters', 'oz', 'oz.', 'ounces', 'slice', 'lb.', 'item', 'l',
      'items', 'ingredients', 'topping', 'toppings', 'flavor', 'flavors', 'wings'
    ];

    if (numMatched) {
      let { num, dot, word } = numMatched.groups;
      // if dot after number, definite number, otherwise we check if a measure word after number or not
      let hasMeasure = measureWords.includes((word || '').toLowerCase());
      if (num && /\D+$/.test(num)) {
        let [suffix] = num.match(/\D+$/);
        // for 20oz XXX case
        hasMeasure = measureWords.includes((suffix || '').toLowerCase());
        if (hasMeasure) {
          num = num.replace(/\D+$/, '');
        }
      }
      // if has a dot, we think we matched a number
      if (!!dot) {
        // skip .Mongolian, B.B.Q, N.Y, X.O., 16.99 oz Soda cases
        return num && !/^[a-z]\.\s?([a-z]\.?\s?){1,2}/i.test(name) && !/^\d+\.\d+/.test(name)
      } else {
        // if has measure word, we check if num has non-digits character
        if (hasMeasure) {
          return /\D+/.test(num);
        } else {
          // if no measure word, no dot and pure digits or digits with L/l
          // we check the item's number property
          if (/^\d+(M?L)?$/i.test(num)) {
            return !item.number;
          } else {
            // no dot and measure word, we check if num has digits
            return /\d/.test(num);
          }
        }
      }
    }
    return false;
  }

  static detect(item, translations) {
    let { name } = item;
    if (!name) {
      return false;
    }

    name = name.trim();
    // extract the possible number info from menu's name
    let numMatched = this.parsePrefixNum(name);
    // if name itself has a number, like 3 cups chicken, 4 pcs XXX etc. these will extract the measure word to judge
    let measureWords = [
      'piece', 'pieces', 'pc', 'pcs', 'pc.', 'pcs.', 'cups', 'cup',
      'liter', 'liters', 'oz', 'oz.', 'ounces', 'slice', 'lb.', 'item',
      'items', 'ingredients', 'topping', 'toppings', 'flavor', 'flavors'
    ];
    let number, hasMeasure = false;
    if (numMatched) {
      let { to_rm, num, dot, word } = numMatched.groups;
      // if dot after number, definite number, otherwise we check if a measure word after number or not
      hasMeasure = measureWords.includes((word || '').toLowerCase());
      if (num && /\D+$/.test(num)) {
        let [suffix] = num.match(/\D+$/);
        // for 20oz XXX case
        hasMeasure = measureWords.includes((suffix || '').toLowerCase());
        if (hasMeasure) {
          num = num.replace(/\D+$/, '');
        }
      }
      if (!!dot || !hasMeasure) {
        // remove leading number chars
        name = name.replace(to_rm, '');
      }
      if (!hasMeasure) {
        number = item.number || num;
      }

    }

    // if we meet 【回锅 肉】，we should be able to keep "回锅" and "肉" together with space as zh
    let regex = /[\s\-(\[]?(\s*([^\x00-\xff]+)(\s+[^\x00-\xff]+)*\s*)[\s)\]]?/;
    let re = name.match(regex);
    if (re) {
      let zh = re[1].trim(), en = name.replace(regex, '').trim().replace(/\s*-$/, '');
      // remove brackets around name
      en = en.replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)]$/, '$1');
      zh = zh.replace(/^（(.+)）$/, '$1').replace(/^【(.+)】$/, '$1');

      let trans = (translations || []).find(x => x.EN === en);
      return !(trans && trans.ZH === zh && !number);
    }
    return !!number;
  }

  static detectNumberByMc(mc, rtId, detectedMcs) {
    if (!mc.mis) {
      return false;
    }
    let numbers = [], names = [], len = mc.mis.length, repeatNums = [];
    for (let i = 0; i < len; i++) {
      let mi = mc.mis[i];
      if (!mi.name || mi.number) {
        return false;
      }
      let [num, ...rest] = mi.name.split('.');
      // remove pure name's prefix ) or . or -
      let name = rest.join('.').replace(/^\s*[-).]\s*/, '').trim();
      num = num.trim();
      // cases to skip:
      // 1. num or name is empty; eg. Soda, B-A, B-B, Combo 1, Combo 2 etc.
      // 2. name repeat; eg. 2 Wings, 3 Wings, 4 Wings, etc.
      // 3. num includes 3+ continuous letter eg. Especial 1. Camarofongo, Especial 2. Camarofongo etc.
      // 4. num contains non-english characters eg. 蛋花汤 S1. Egg Drop Soup, 云吞汤 S2. Wonton Soup etc.
      // 5. num contains parentheses aka (), as we don't know if the () thing is related to the menu name
      // 6. original name startsWith 805 B.B.+ etc
      // 7. original name startsWith 12 oz. etc
      if (!num || !name || /\(.*\)/.test(num)
        || /^(\d+\s+)*([a-zA-Z]+\.){2,}/.test(mi.name)
        || /^(\d+\.?)+\s+[a-zA-Z]{2,}\./.test(mi.name)
        || names.some(n => n.toLowerCase() === name.toLowerCase())
        || /[a-z]{3,}/i.test(num) || /[^\x00-\xff]/.test(num)) {
        continue;
      }
      names[i] = name;
      // if or num repeat, we save the repeat num and index for later use
      if (numbers.some(n => n.toLowerCase() === num.toLowerCase())) {
        repeatNums[i] = num;
        continue;
      }
      // if num has (), we should extract the () and set to name
      let [remark] = num.match(/\(.*\)/) || [''];
      if (remark) {
        names[i] = remark + names[i];
      }
      numbers[i] = num;
    }
    // only handle mcs with at least 5 mis
    if (numbers.length < 5) {
      return false;
    }

    let confidence = numbers.filter(n => !!n).length / len;
    // calculate exception ratio , skip lower then 0.79 (4 of 5)
    if (Math.ceil(confidence * 100) < 80) {
      return false;
    }
    detectedMcs.push({
      rt: rtId, mc: mc.name, mis: mc.mis.map((mi, i) => (numbers[i] || repeatNums[i]) + ' | ' + mi.name + '      |      ' + names[i])
    });
    mc.mis.forEach((mi, i) => {
      if (numbers[i] || repeatNums[i]) {
        mi.number = numbers[i] || repeatNums[i];
        mi.name = names[i];
      }
    });
    return true;
  }
}
