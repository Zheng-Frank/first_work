import { environment } from '../../environments/environment';
import { ApiService } from '../services/api.service';
import {Address, Hour, TimezoneHelper} from '@qmenu/ui';
import { HttpClient } from '@angular/common/http';
import { saveAs } from "file-saver/FileSaver";

const FULL_LOCALE_OPTS = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };

export class Helper {

    static FULL_DATETIME_LOCALE_OPTS = FULL_LOCALE_OPTS;

    // compute tier of a rt by orderPerMonth or other input param
    static getTier(value = 0) {
        if (value > 125) { // VIP
            return 0;
          }
          if (value > 40) {
            return 1;
          }
          if (value > 4) {
            return 2;
          }
          if (value >= 0) {
            return 3;
          }
    }  

    // try to wait until a given resource is ready (useful when upload an image but not knowing when the image is ready)
    static async waitUtilImageExists(url: string, timeout = 10000) {
        const timeoutT = new Date(new Date().valueOf() + timeout);
        while (new Date() < timeoutT) {
            try {
                await fetch(url);
                return true;
            } catch (error) {
            }
            await new Promise(resolve => setTimeout(resolve, 500 * 1));
        }
        return false;
    }

    static async uploadImage(files: File[], _api: ApiService, _http: HttpClient) {
        // let's take only the first file so far (possible for multiple files in future)
        const [file] = files;
        if (file.type.indexOf('image') < 0) {
            throw new Error('Invalid file type. Choose image only.');
        } else if (file.size > 20000000) {
            throw new Error('The image size exceeds 20M.');
        } else {
            // tslint:disable-next-line:max-line-length
            const apiPath = `utils/s3-signed-url?contentType=${file.type}&prefix=menuImage&extension=${file.name.split('.').pop()}&bucket=chopst&expires=3600`;
            // Get presigned url
            try {
                const response = await _api.get(environment.appApiUrl + apiPath).toPromise();
                const presignedUrl = response['url'];
                await _http.put(presignedUrl, file).toPromise();
                return { Location: presignedUrl.slice(0, presignedUrl.indexOf('?')) };
            } catch (error) {
                throw new Error('Failed to get presigned Url');
            }
        }
    }

    static areObjectsEqual(obj1, obj2) {
        if (Object.is(obj1, obj2)) {
            return true;
        }
        // now make sure obj1 and obj2 have same keys
        if (typeof obj1 !== typeof obj2 || typeof obj1 !== 'object') {
            return false;
        }
        // date compare
        if (obj1 instanceof Date) {
            return (obj2 instanceof Date) && obj1.valueOf() === obj2.valueOf();
        }

        const keys1 = Object.getOwnPropertyNames(obj1);
        const keys2 = Object.getOwnPropertyNames(obj2);
        if (keys1.length !== keys2.length || keys1.some(k1 => keys2.indexOf(k1) < 0)) {
            return false;
        }

        if (keys1.some(k1 => !Helper.areObjectsEqual(obj1[k1], obj2[k1]))) {
            return false;
        }
        return true;
    }

    static getFileName(url) {
        if (!url) {
            return url;
        }
        let fileNameIndex = url.lastIndexOf('/') + 1;
        if (fileNameIndex <= 0) {
            fileNameIndex = url.lastIndexOf('\\') + 1;
        }
        if (fileNameIndex <= 0) {
            return url;
        }
        return url.substr(fileNameIndex);
    }

    static getThumbnailUrl(originalUrl): string {
        return originalUrl && environment.thumnailUrl + this.getFileName(originalUrl);
    }

    static getNormalResUrl(originalUrl): string {
        return originalUrl && environment.normalResUrl + this.getFileName(originalUrl);
    }

    static areDomainsSame(d1: string, d2: string): boolean {
        if (!d1 || !d2) {
            return false;
        }
        // stripe remove things before / and after /
        if (!d1.startsWith('http:') && !d1.startsWith('https:')) {
            d1 = 'http://' + d1;
        }

        if (!d2.startsWith('http:') && !d2.startsWith('https:')) {
            d2 = 'http://' + d2;
        }

        let host1 = new URL(d1).host;
        let host2 = new URL(d2).host;
        // treating www as nothing
        if (!host1.startsWith('www.')) {
            host1 = 'www.' + host1;
        }
        if (!host2.startsWith('www.')) {
            host2 = 'www.' + host2;
        }
        return host1 === host2;
    }

    static getTopDomain(url: string): string {
        if (!url) {
            return;
        }

        // remove things before / and after /
        if (!url.startsWith('http:') && !url.startsWith('https:')) {
            url = 'http://' + url;
        }
        try {
            let host = new URL(url).host;
            // keep ONLY last two (NOT GOOD for other country's domain)
            return host.split('.').slice(-2).join('.');
        } catch (error) {
            console.log(url);
            return;
        }
    }


    static processBatchedPromises(promises): any {
        return Promise.all(promises.map(p => new Promise((resolve, reject) => {
            p.then(data => {
                resolve({ result: data, success: true });
            }).catch(error => {
                resolve({ result: error, success: false });
            });
        })));
    }

    static getDaysFromId(mongoId, now): any {
        return Math.floor((now.valueOf() - parseInt(mongoId.substring(0, 8), 16) * 1000) / (24 * 3600000));
    }

    static getDesiredUrls(restaurant) {
        const web = restaurant.web || {};
        // refer to https://docs.google.com/document/d/1kUt2QY8Xmx_gO-mQhVxrQoKkcYtV0cHTu1HmfVEUEQY/edit

        const aliasUrl = environment.customerUrl + '#/' + restaurant.alias;
        let restaurantWebsite = (web.bizManagedWebsite || '').trim().toLowerCase();
        let qmenuWebsite = (web.qmenuWebsite || '').trim().toLowerCase();

        // normalize websites!
        if (qmenuWebsite && !qmenuWebsite.startsWith('http')) {
            qmenuWebsite = 'http://' + qmenuWebsite;
        }

        if (restaurantWebsite && !restaurantWebsite.startsWith('http')) {
            restaurantWebsite = 'http://' + restaurantWebsite;
        }

        const insistedWebsite = web.useBizWebsite;
        const insistedAll = web.useBizWebsiteForAll;

        let targetWebsite = qmenuWebsite;

        if (insistedAll || insistedWebsite) {
            targetWebsite = restaurantWebsite || qmenuWebsite;
        }

        let menuUrl = restaurantWebsite || aliasUrl;
        if (web.useBizMenuUrl && web.menuUrl) {
            menuUrl = web.menuUrl;
        } else if (qmenuWebsite && !insistedAll) {
            menuUrl = qmenuWebsite;
        }

        let orderAheadUrl = restaurantWebsite || aliasUrl;
        if (web.useBizOrderAheadUrl && web.orderAheadUrl) {
            orderAheadUrl = web.orderAheadUrl;
        } else if (qmenuWebsite && !insistedAll) {
            orderAheadUrl = qmenuWebsite;
        }

        let reservationUrl = restaurantWebsite || aliasUrl;
        if (web.useBizReservationUrl && web.reservationUrl) {
            reservationUrl = web.reservationUrl;
        } else if (qmenuWebsite && !insistedAll) {
            reservationUrl = qmenuWebsite;
        }
        return {
            website: targetWebsite,
            menuUrl: menuUrl,
            orderAheadUrl: orderAheadUrl,
            reservation: reservationUrl
        };
    }

    static getState(formatted_address) {
        try {
            let addressArray = formatted_address.split(',');
            if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)) {
                let state = addressArray[addressArray.length - 1].match(/\b[A-Z]{2}/)[0];
                return state;
            }
        } catch (e) {
            return '';
        }
    }

    static getCity(formatted_address) {
        try {
            let addressArray = formatted_address.split(',');
            if (addressArray[addressArray.length - 2]) {
                let city = addressArray[addressArray.length - 2].trim();
                return city;
            }
        } catch (e) {
            return '';
        }
    }

    static getZipcode(formatted_address) {
        try {
            let addressArray = formatted_address.split(',');
            if (addressArray[addressArray.length - 1] && addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)) {
                let zip = addressArray[addressArray.length - 1].match(/\b\d{5}\b/g)[0].trim();
                return zip;
            }
        } catch (e) {
            return '';
        }
    }


    static getAddressLine1(formatted_address) {
        try {
            let addressArray = formatted_address.split(',');
            return addressArray[0];
        } catch (e) {
            return '';
        }
    }

    static getLine1(address: Address) {
        if (!address) {
            return 'Address Missing';
        }
        return (address.street_number ? address.street_number : '') + ' '
            + (address.route ? ' ' + address.route : '') +
            (address.apt ? ', ' + address.apt : '');
    }

    static getTimeZoneAbbr({timezone, country, formatted_address}) {
      if (!timezone) {
        return 'UNKNOWN';
      }
      let options = {timeZone: timezone, timeZoneName: 'short'}
      if (!country) {
        let nation = formatted_address.split(',').pop().trim();
        if (['US', 'USA'].includes(nation)) {
          country = 'US'
        } else if (['Canada', 'CA'].includes(nation)) {
          country = 'CA'
        }
      }
      let str = new Date().toLocaleString('en-' + (country || 'US'), options)
      return str.split(',')[1].trim();
    }

  static getTimeZone(formatted_address) {
        const tzMap = {
            PDT: ['WA', 'OR', 'CA', 'NV', 'AZ'],
            MDT: ['MT', 'ID', 'WY', 'UT', 'CO', 'NM'],
            CDT: ['ND', 'SD', 'MN', 'IA', 'NE', 'KS',
                'OK', 'TX', 'LA', 'AR', 'MS', 'AL', 'TN', 'MO', 'IL', 'WI'],
            EDT: ['MI', 'IN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
                'OH', 'PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'RJ', 'CT',
                'NJ', 'DE', 'MD', 'DC', 'RI'],
            HST: ['HI'],
            AKDT: ['AK']
        };

        let matchedTz = '';
        if (formatted_address) {
            let matched = formatted_address.match(/\s[A-Z]{2},?\s/g);
            if (matched) {
              let state = matched.pop().replace(/^\s(\w+),?\s/, "$1");
              Object.keys(tzMap).map(tz => {
                if (tzMap[tz].indexOf(state) > -1) {
                  matchedTz = tz;
                }
              });
            }
        }
        return matchedTz;
    }


    static getOffsetNumToEST(timezone: string) {
        if (timezone) {
            const now = new Date();
            const offset = (new Date(now.toLocaleString('en-US', { timeZone: timezone, ...FULL_LOCALE_OPTS })).valueOf()
                - new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York', ...FULL_LOCALE_OPTS })).valueOf()) / 3600000;
            if (offset > 0) {
                return '+' + offset;
            } else {
                return offset;
            }
        } else {
            return '+0';
        }
    }

    /**
     * give a local date, get it's correspond time in given timezone, then convert that time to local time
     * eg. local(New_York): 4/9/2021, 12:30:50 AM, correspond Phoenix time is 4/9/2021, 9:30:50 AM,
     * we'll get a 4/9/2021, 9:30:50 AM show on local
     * @param datetime
     * @param timezone
     */
    static adjustDate(datetime: Date, timezone?: string) {
        return new Date(datetime.toLocaleString('en-US', { timeZone: timezone, ...FULL_LOCALE_OPTS }));
    }

    static getNewYorkDate(bound: 'start'|'end', date?) {
      return Helper.getTimezoneDate(bound, 'America/New_York', date);
    }

    static getTimezoneDate(bound: 'start'|'end', timezone, date?: string) {
      let time = {'start': ' 00:00:00.000', 'end': ' 23:59:59.999'}[bound];
      if (!date) {
        let dt = new Date();
        date = [dt.getFullYear(), Helper.padNumber(dt.getMonth() + 1), Helper.padNumber(dt.getDate())].join("-");
      }
      return TimezoneHelper.getTimezoneDateFromBrowserDate(new Date(date + time), timezone);
    }

    static padNumber(num: number, length = 2) {
      let digits = num.toString();
      while (digits.length < length) {
        digits = "0" + digits;
      }
      return digits;
    }

    static sanitizedName(menuItemName) {
        let processedName;

        // remove (Lunch) and numbers
        processedName = (menuItemName || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[0-9]/g, '').trim();
        processedName = processedName.replace('&', '');
        processedName = processedName.replace('.', ' ');
        // processedName = processedName.replace('w.', ' ');
        // processedName = processedName.replace('with', ' ');

        // Remove non-English characters
        processedName = processedName.replace(/[^\x00-\x7F]/g, '');

        // 19a Sesame Chicken --> Sesame Chicken
        // B Bourbon Chicken --> Bourbon Chicken
        let nameArray = processedName.split(' ');
        for (let i = 0; i < nameArray.length; i++) {
            // remove 19a
            if (/\d/.test(nameArray[i]) || nameArray[i].length === 1) {
                nameArray.splice(i, 1);
            }
        }
        processedName = nameArray.join(' ');
        // remove extra space between words
        processedName = processedName.replace(/\s+/g, '').trim();
        return processedName;
    }

    static getSalesAgent(rateSchedules, users) {
        let now = Date.now();
        const isEnabled = x => users.some(u => u.username === x.agent && !u.disabled);
        let list = (rateSchedules || []).filter(x => isEnabled(x) && new Date(x.date).valueOf() <= now.valueOf())
            .sort((x, y) => new Date(x.date).valueOf() - new Date(y.date).valueOf());
        let item = list.pop() || {};
        return item.agent || 'N/A';
    }

    static shrink = str => str.trim().replace(/\s+/g, ' ');

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
        let name = this.shrink(rest.join('.').replace(/^\s*[-).]\s*/, ''));
        num = this.shrink(num);
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
            return this.shrink(chars.join(''));
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

    static parseGMBHours(hours, timezone) {
      const apRegex = /am|pm/i;

      const parseTime = (time, m) => {
        let parts = time.replace(m, '').split(':');
        while (parts.length < 3) {
          parts.push('00');
        }
        if (m.toLowerCase() === 'pm') {
          parts[0] = Number(parts[0]) + 12;
          if (parts[0] === 24) {
            parts[0] -= 12;
          }
        }
        return parts.join(':');
      };

      const result = [];
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .forEach((day, index) => {
          let date = new Date('2000/1/2');
          let diff = index - date.getDay();
          date.setDate(date.getDate() + diff);
          let datePart = date.toLocaleString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'});
          let durations = hours[day];
          // 2 special case: Closed, Open 24 hours
          if (durations && durations !== 'Closed') {
            if (durations === 'Open 24 hours') {
              date.setDate(date.getDate() + 1);
              let endDatePart = date.toLocaleString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'});
              result.push(new Hour({
                occurence: 'WEEKLY',
                fromTime: TimezoneHelper.parse([datePart, '00:00'].join(' '), timezone),
                toTime: TimezoneHelper.parse([endDatePart, '00:00'].join(' '), timezone),
              }));
            } else {
              // normal case: 10AM - 3:30PM, 3 - 8PM
              durations.split(',').forEach(duration => {
                let [start, end] = duration.trim().split('–');
                let endM = end.match(apRegex), startM = start.match(apRegex) || endM;
                start = parseTime(start, startM[0]);
                end = parseTime(end, endM[0]);
                result.push(new Hour({
                  occurence: 'WEEKLY',
                  fromTime: TimezoneHelper.parse([datePart, start].join(' '), timezone),
                  toTime: TimezoneHelper.parse([datePart, end].join(' '), timezone),
                }));
              });
            }
          }
        });
      return result;
    }

    static downloadCSV(filename: string, fields: {paths: string[], label: string}[], data: object[]) {
      let lines = [fields.map(({label}) => label).join(",")];
      data.forEach(item => {
        lines.push(fields.map(({paths}) => {
          let keys = [...paths].reverse(), key = keys.pop(), value = item;
          while (key && value) {
            value = value[key]
            key = keys.pop();
          }
          return (value === null || value === undefined) ? '' : value;
        }).join(','))
      })
      if (!filename.endsWith('.csv')) {
        filename += '.csv';
      }
      saveAs(new Blob([lines.join('\n')], { type: "application/octet-stream" }), filename);
    }

  // see https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
  // mainly to address 1.005 round issue, should be 1.01, but will get 1 without epsilon added
  static roundDecimal(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

}
