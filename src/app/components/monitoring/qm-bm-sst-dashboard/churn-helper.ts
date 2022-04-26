import {Helper} from "../../../classes/helper";
import {KPIPeriodOptions, PlatformOptions} from "./qm-bm-sst-dashboard.component";

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


interface BaseChurnSets {
  start: Set<string>;
  end: Set<string>;
  canceled: Set<string>;
  inactive: Set<string>;
  created: Set<string>;
}

interface PlatformPeriodChurnSets {
  tier_0: BaseChurnSets, tier_1: BaseChurnSets, tier_2: BaseChurnSets, tier_3: BaseChurnSets
}

interface PeriodChurnSets {
  bm: PlatformPeriodChurnSets, qm: PlatformPeriodChurnSets, both: PlatformPeriodChurnSets
}

interface ChurnSets {
  [key: string]: PeriodChurnSets
}


interface BaseChurnCount {
  start: number, // RTs at duration start
  end: number, // RTs at duration end
  lostToUp: number, // cur tier to higher tier
  gainByUp: number, // from higher tier to cur tier
  lostToDown: number, // cur tier to lower tier
  gainByDown: number, // from lower tier to cur tier
  canceled: number, // RTs disabled in duration
  inactive: number, // RTs with orders = 0 in duration
  created: number, // RTs newly created in duration
}

interface PlatformPeriodChurnCount {
  tier_0: BaseChurnCount, tier_1: BaseChurnCount, tier_2: BaseChurnCount, tier_3: BaseChurnCount
}

interface PeriodChurnCount {
  bm: PlatformPeriodChurnCount, qm: PlatformPeriodChurnCount, both: PlatformPeriodChurnCount
}

interface ChurnCount {
  [key: string]: PeriodChurnCount
}


const getDurationKeys = (mon) => {
  let y = mon.substr(0, 4), m = Number(mon.substr(4));
  let shortYear = y.substr(2), q = Math.ceil(m / 3);
  let month = shortYear + ' ' + MONTH_ABBR[m - 1], quarter = shortYear + ' ' + 'Q' + q;
  return { year: y, quarter, month };
}

const getYM = (date) => {
  if (!date) {
    return "";
  }
  date = new Date(date);
  let y = date.getFullYear(), m = date.getMonth() + 1;
  return `${y}${Helper.padNumber(m)}`;
}

const baseChurnSets = (): BaseChurnSets => {
  let obj = {} as BaseChurnSets;
  ["start", "end", "canceled", "created", "inactive"].forEach(key => {
    obj[key] = new Set();
  })
  return obj;
}
const tier_key = t => `tier_${t}` as keyof PlatformPeriodChurnSets

const defaultChurnValue = (): PeriodChurnSets => {
  let obj = {} as PeriodChurnSets;
  ["qm", "bm", "both"].forEach(plat => {
    obj[plat] = {} as PlatformPeriodChurnSets;
    [0, 1, 2, 3].forEach(tier => {
      obj[plat][tier_key(tier)] = baseChurnSets();
    })
  });
  return obj;
}

const baseChurnCount = (): BaseChurnCount => {
  let obj = {} as BaseChurnCount;
  ["start", "end", "canceled", "created", "lostToUp", "gainByUp", "lostToDown", "gainByDown", "inactive"].forEach(key => {
    obj[key] = 0;
  })
  return obj;
}


const sort_month = (ka, kb) => {
  let [year_a, month_a] = ka.split(' '),
    [year_b, month_b] = kb.split(' ');
  if (year_a !== year_b) {
    return Number(year_a) - Number(year_b);
  }
  return MONTH_ABBR.indexOf(month_a) - MONTH_ABBR.indexOf(month_b);
};

const sort_quarter = (ka, kb) => {
  let [year_a, quarter_a] = ka.split(' '),
    [year_b, quarter_b] = kb.split(' ');
  if (year_a !== year_b) {
    return Number(year_a) - Number(year_b);
  }
  return Number(quarter_a.substr(1)) - Number(quarter_b.substr(1));
};

const sort_year = (ka, kb) => Number(ka) - Number(kb);

export default class ChurnHelper {

  static years: string[] = [];
  static quarters: string[] = [];
  static months: string[] = [];

  static yearly: ChurnCount = {};
  static quarterly: ChurnCount = {};
  static monthly: ChurnCount = {};

  static getList({platform, period_type, tier, definition}) {
    let data = {
      [KPIPeriodOptions.Yearly]: this.yearly,
      [KPIPeriodOptions.Quarterly]: this.quarterly,
      [KPIPeriodOptions.Monthly]: this.monthly
    }[period_type];
    let tk = tier_key(tier), sorter = {
      [KPIPeriodOptions.Yearly]: sort_year,
      [KPIPeriodOptions.Quarterly]: sort_quarter,
      [KPIPeriodOptions.Monthly]: sort_month
    }[period_type];
    let plat_key = {
      [PlatformOptions.Both]: 'both',
      [PlatformOptions.BmOnly]: 'bm',
      [PlatformOptions.QmOnly]: 'qm'
    }[platform]
    return Object.entries(data).map(([key, value]) => {
      let tmp = value[plat_key][tk];
      return {period: key, ...tmp}
    }).sort((a, b) => sorter(b.period, a.period));
  }


  static aggregate(origin, sorter) {
    const result = {};
    let prev = defaultChurnValue();
    Object.entries(origin).sort(sorter).forEach(([period, rts]) => {
      let tmp = result[period] || defaultChurnValue();
      Object.entries(rts).forEach(([union_id, counts]) => {
        ['qm', 'bm', 'both'].forEach(plat => {
          let tk = tier_key(Helper.getTier(counts[plat]));
          tmp[plat][tk].end.add(union_id);
          if (!counts[plat]) {
            tmp[plat][tk].inactive.add(union_id)
          }
        });
      });
      result[period] = tmp;
      prev = {...tmp};
    });
    return result;
  }

  static prepare(union_rts, union_rt_dict, bm_data, qm_data) {
    console.log('created at...', union_rts.filter(x => !!x.createdAt))
    console.log('disabled at...', union_rts.filter(x => !!x.disabledAt));

    const rts_monthly = {}, rts_quarterly = {}, rts_yearly = {};
    const cur_mon = new Date().getMonth() + 1, cur_year = new Date().getFullYear();
    const first_accumulate = (accumulated, key, count, union_id) => {
      let tmp = accumulated[key] || {};
      tmp[union_id] = {bm: count, both: count, qm: 0};
      accumulated[key] = tmp;
    };
    const Years = new Set(), Quarters = new Set(), Months = new Set();
    let earliest = new Date().valueOf();
    bm_data.forEach(({bmid, month, count_orders}) => {
      earliest = Math.min(earliest, new Date(month).valueOf())
      let [y, m] = month.split('T')[0].split('-'), n_y = Number(y), n_m = Number(m);
      let quarter = Math.ceil(n_m / 3), shortYear = y.substr(2);
      let month_key = shortYear + ' ' + MONTH_ABBR[n_m - 1], quarter_key = shortYear + ' ' + 'Q' + quarter;
      Years.add(y);
      Quarters.add(quarter_key);
      Months.add(month_key);
      let union_id = union_rt_dict.bm[bmid];
      if (union_id) {
        first_accumulate(rts_monthly, month_key, count_orders, union_id);

        let is_latest_month = n_y === cur_year && n_m === cur_mon - 1;
        if (n_m % 3 === 0 || is_latest_month) {
          first_accumulate(rts_quarterly, quarter_key, count_orders, union_id);
        }
        if (n_m === 12 || is_latest_month) {
          first_accumulate(rts_yearly, y, count_orders, union_id);
        }
      }
    });
    const second_accumulate = (accumulated, key, count, union_id) => {
      let tmp = accumulated[key] || {};
      let tmp_rt = tmp[union_id] || {bm: 0, both: 0, qm: 0};
      tmp_rt.qm = count;
      tmp_rt.both += count;
      tmp[union_id] = tmp_rt;
      accumulated[key] = tmp;
    };
    qm_data.forEach(({qmid, month, count_orders}) => {
      earliest = Math.min(earliest, new Date(month).valueOf())
      let [y, m] = month.split('T')[0].split('-'), n_y = Number(y), n_m = Number(m);
      let quarter = Math.ceil(n_m / 3), shortYear = y.substr(2);
      let month_key = shortYear + ' ' + MONTH_ABBR[n_m - 1], quarter_key = shortYear + ' ' + 'Q' + quarter;
      Years.add(y);
      Quarters.add(quarter_key);
      Months.add(month_key);
      let union_id = union_rt_dict.qm[qmid];
      if (union_id) {
        second_accumulate(rts_monthly, month_key, count_orders, union_id);

        let is_latest_month = n_y === cur_year && n_m === cur_mon - 1;
        if (n_m % 3 === 0 || is_latest_month) {
          second_accumulate(rts_quarterly, quarter_key, count_orders, union_id);
        }
        if (n_m === 12 || is_latest_month) {
          second_accumulate(rts_yearly, y, count_orders, union_id);
        }
      }
    });

    const monthly_data = this.aggregate(rts_monthly, ([ka], [kb]) => sort_month(ka, kb));
    const quarterly_data = this.aggregate(rts_quarterly, ([ka], [kb]) => sort_quarter(ka, kb));
    const yearly_data = this.aggregate(rts_yearly, ([ka], [kb]) => sort_year(ka, kb));
    this.created_disabled(union_rts, earliest, union_rt_dict, monthly_data, quarterly_data, yearly_data);
    // complement duration data
    this.complement(Years, Quarters, Months, earliest);
    // calculate changes
    this.stat(monthly_data, quarterly_data, yearly_data);
  }

  static created_disabled(union_rts, earliest, union_rt_dict, monthly_data, quarterly_data, yearly_data) {

    const place_created = (union_id, create_dates) => {
      create_dates.forEach(({platform, date}) => {
        let { month, quarter, year } = getDurationKeys(getYM(date));
        let tmp_month = monthly_data[month] || defaultChurnValue();
        let tmp_quarter = quarterly_data[quarter] || defaultChurnValue();
        let tmp_year = yearly_data[year] || defaultChurnValue();

        [0, 1, 2, 3].forEach(t => {
          let tk = tier_key(t);

          if (tmp_month[platform][tk].end.has(union_id)) {
            tmp_month[platform][tk].created.add(union_id);
            monthly_data[month] = tmp_month;
          }
          if (tmp_quarter[platform][tk].end.has(union_id)) {
            tmp_quarter[platform][tk].created.add(union_id);
            quarterly_data[quarter] = tmp_quarter;
          }
          if (tmp_year[platform][tk].end.has(union_id)) {
            tmp_year[platform][tk].created.add(union_id);
            yearly_data[year] = tmp_year;
          }
        })
      })
    }

    const get_prev_month = month => {
      let [y, mo] = month.split(' ');
      y = Number(y);
      let m = Number(MONTH_ABBR.indexOf(mo));
      m--;
      if (m < 0) {
        y--;
        m = 11
      }
      return `${y} ${MONTH_ABBR[m]}`;
    }
    const get_prev_quarter = quarter => {
      let [y, q] = quarter.split(' ');
      y = Number(y);
      q = Number(q.substr(1));
      q--;
      if (q === 0) {
        y--;
        q = 4;
      }
      return `${y} Q${q}`;
    }

    const get_prev_year = year => `${Number(year) - 1}`;

    const place_disabled = (union_id, disabled_dates) => {
      disabled_dates.forEach(({platform, date}) => {
        let { month, quarter, year } = getDurationKeys(getYM(date));
        let cur_month = monthly_data[month] || defaultChurnValue();
        let cur_quarter = quarterly_data[quarter] || defaultChurnValue();
        let cur_year = yearly_data[year] || defaultChurnValue();

        let prev_month = monthly_data[get_prev_month(month)] || defaultChurnValue(),
          prev_quarter = quarterly_data[get_prev_quarter(quarter)] || defaultChurnValue(),
          prev_year = yearly_data[get_prev_year(year)] || defaultChurnValue();

        [0, 1, 2, 3].forEach(t => {
          let tk = tier_key(t);

          // canceled should count on start tier (prev month's end tier)
          if (prev_month[platform][tk].end.has(union_id)) {
            cur_month[platform][tk].canceled.add(union_id);
          }
          cur_month[platform][tk].end.delete(union_id)
          monthly_data[month] = cur_month;

          if (prev_quarter[platform][tk].end.has(union_id)) {
            cur_quarter[platform][tk].canceled.add(union_id);
          }
          cur_quarter[platform][tk].end.delete(union_id);
          quarterly_data[quarter] = cur_quarter;


          if (prev_year[platform][tk].end.has(union_id)) {
            cur_year[platform][tk].canceled.add(union_id);
          }
          cur_year[platform][tk].end.delete(union_id);
          yearly_data[year] = cur_year;

        })
      })
    }

    // add created and disabled data;
    union_rts.forEach(({_id, disabledAt, createdAt, bdisabledAt, bcreatedAt}) => {
      let last_disabled_at = -Infinity, first_created_at = Infinity;
      const created_dates = [], disabled_dates = [];
      if (createdAt) {
        // earliest = Math.min(earliest, new Date(createdAt).valueOf());
        created_dates.push({platform: 'qm', date: createdAt});
        first_created_at = new Date(createdAt).valueOf();
      }
      if (disabledAt) {
        disabled_dates.push({platform: 'qm', date: disabledAt});
        last_disabled_at = new Date(disabledAt).valueOf();
      }
      if (bcreatedAt) {
        // earliest = Math.min(earliest, new Date(bcreatedAt).valueOf());
        created_dates.push({platform: 'bm', date: bcreatedAt});
        first_created_at = Math.min(first_created_at, new Date(bcreatedAt).valueOf());
      }
      if (bdisabledAt) {
        disabled_dates.push({platform: 'bm', date: bdisabledAt});
        last_disabled_at = Math.max(last_disabled_at, new Date(bdisabledAt).valueOf());
      }
      if (first_created_at !== Infinity) {
        created_dates.push({platform: 'both', date: first_created_at});
      }
      if (last_disabled_at !== -Infinity) {
        disabled_dates.push({platform: 'both', date: last_disabled_at});
      }

      let union_id = union_rt_dict.qm[_id];
      if (union_id) {
        // need to check if this period data exists (since order data mostly from later than createdAt)
        place_created(union_id, created_dates);
        place_disabled(union_id, disabled_dates);
      }
    });
  }

  static process(accum, uuid, platform, period, count, disabled, created) {
    let tier = Helper.getTier(count);
    if (!accum[period]) {
      accum[period] = defaultChurnValue();
    }
    let temp = accum[period][platform];
    let tier_data = temp[`tier_${tier}`] as BaseChurnSets;
    tier_data.end.add(uuid);
    if (disabled) {
      tier_data.canceled.add(uuid);
    }
    if (created) {
      tier_data.created.add(uuid);
    }
    if (!count) {
      tier_data.inactive.add(uuid);
    }
    accum[period][platform][`tier_${tier}`] = tier_data;
  }

  static init(union_rts) {
    // monthly: {"Jan 2020": {qm: [100, 1000, 2000, 3000], bm: [100, 1000, 2000, 3000], both: [150, 1500, 3000, 5000]}, ...}
    // quarterly: {"2020 Q1": {qm: [100, 1000, 2000, 3000], bm: [100, 1000, 2000, 3000], both: [150, 1500, 3000, 5000]}, ...}
    // yearly: {"2020": {qm: [100, 1000, 2000, 3000], bm: [100, 1000, 2000, 3000], both: [150, 1500, 3000, 5000]}, ...}

    const Years = new Set(), Quarters = new Set(), Months = new Set();

    let cur_mon = getYM(new Date()), cur_yqm = getDurationKeys(cur_mon);
    Years.add(cur_yqm.year);
    Quarters.add(cur_yqm.quarter);
    Months.add(cur_yqm.month);
    const monthly_data = {}, quarterly_data = {}, yearly_data = {};
    let earliest = new Date().valueOf();
    union_rts.forEach(({_id, activity, activities, disabledAt, createdAt, _bid, bactivity, bactivities, bdisabledAt, bcreatedAt}) => {
      activity = activity || 0;
      bactivity = bactivity || 0;
      activities = activities || {};
      bactivities = bactivities || {};
      let uuid = [_id, _bid].filter(x => !!x).join('-');
      earliest = Math.min(earliest, new Date(createdAt).valueOf(), new Date(bcreatedAt || 0).valueOf());
      let disabledMon = getYM(disabledAt), createdMon = getYM(createdAt);
      let bdisabledMon = getYM(bdisabledAt), bcreatedMon = getYM(bcreatedAt);

      let bothOrders = {}, latest = { qm: 0, bm: 0 };
      let qm_sorted = Object.entries(activities as {[key: string]: number}).sort((a, b) => Number(a[0]) - Number(b[0]));
      qm_sorted.forEach(([mon, count], index) => {
        let { year, quarter, month } = getDurationKeys(mon);
        Years.add(year);
        Quarters.add(quarter);
        Months.add(month);
        this.process(monthly_data, uuid, 'qm', month, count, disabledMon === mon, createdMon === mon);
        bothOrders[month] = count;
        let mon_num = Number(mon.substr(4));
        if (mon_num % 3 === 0) {
          this.process(quarterly_data, uuid, 'qm', quarter, count, disabledMon === mon, createdMon === mon)
        }
        if (mon_num === 12) {
          this.process(yearly_data, uuid, 'qm', year, count, disabledMon === mon, createdMon === mon)
        }
        if (index === qm_sorted.length - 1) {
          let tmp_date = new Date();
          tmp_date.setMonth(tmp_date.getMonth() - 1);
          if (getYM(tmp_date) === mon) {
            latest.qm = count;
          }
        }
      });
      let bm_sorted = Object.entries(bactivities as {[key: string]: number}).sort((a, b) => Number(a[0]) - Number(b[0]));
      bm_sorted.forEach(([mon, count], index) => {
        let { year, quarter, month } = getDurationKeys(mon);
        Years.add(year);
        Quarters.add(quarter);
        Months.add(month);
        let mon_num = Number(mon.substr(4));
        this.process(monthly_data, uuid, 'bm', month, count, bdisabledMon === mon, bcreatedMon === mon);

        let total = (bothOrders[month] || 0) + count;
        // created and canceled data for both will be handled later
        this.process(monthly_data, uuid, 'both', month, total, false, false);
        if (mon_num % 3 === 0) {
          this.process(quarterly_data, uuid, 'bm', quarter, count, bdisabledMon === mon, bcreatedMon === mon)
          this.process(quarterly_data, uuid, 'both', quarter, total, false, false)
        }

        if (mon_num === 12) {
          this.process(yearly_data, uuid, 'bm', year, count, disabledMon === mon, createdMon === mon)
          this.process(yearly_data, uuid, 'both', year, total, false, false)
        }


        if (index === bm_sorted.length - 1) {
          let tmp_date = new Date();
          tmp_date.setMonth(tmp_date.getMonth() - 1);
          if (getYM(tmp_date) === mon) {
            latest.bm = count;
          }
        }

        if (index === 0) {
          earliest = Math.min(earliest, new Date(Number(year), mon_num).valueOf())
        }
      });

      // for current month, use ordersInLast30d
      this.process(monthly_data, uuid, 'qm', cur_yqm.month, activity, disabledMon === cur_mon, createdMon === cur_mon);
      this.process(monthly_data, uuid, 'bm', cur_yqm.month, bactivity, bdisabledMon === cur_mon, bcreatedMon === cur_mon);
      this.process(monthly_data, uuid, 'both', cur_yqm.month, activity + bactivity, false, false);

      // for current quarter and year, use ordersInLast30d if current not across month, latest completed month if across month
      if (Number(cur_mon.substr(4)) === 1) {
        latest.qm = activity;
        latest.bm = bactivity;
      }
      this.process(quarterly_data, uuid, 'qm', cur_yqm.quarter, latest.qm, disabledMon === cur_mon, createdMon === cur_mon);
      this.process(quarterly_data, uuid, 'bm', cur_yqm.quarter, latest.bm, bdisabledMon === cur_mon, bcreatedMon === cur_mon);
      this.process(quarterly_data, uuid, 'both', cur_yqm.quarter, latest.qm + latest.bm, false, false);
    });

    // complement duration data
    this.complement(Years, Quarters, Months, earliest);

    // calculate changes
    this.stat(monthly_data, quarterly_data, yearly_data);
  }

  static complement(years: Set<string>, quarters: Set<string>, months: Set<string>, earliest) {
    let cursor = new Date(earliest), now = new Date();
    while (cursor.valueOf() < now.valueOf()) {
      let { year, month, quarter } = getDurationKeys(getYM(cursor));
      if (!years.has(year)) {
        years.add(year);
      }
      if (!quarters.has(quarter)) {
        quarters.add(quarter);
      }
      if (!months.has(month)) {
        months.add(month);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    this.years = Array.from(years).sort((b, a) => Number(a) - Number(b));
    this.quarters = Array.from(quarters).sort((b, a) => {
      let [year_a, quarter_a] = a.split(' '),
        [year_b, quarter_b] = b.split(' ');
      if (year_a !== year_b) {
        return Number(year_a) - Number(year_b);
      }
      return Number(quarter_a.substr(1)) - Number(quarter_b.substr(1));
    });
    this.months = Array.from(months).sort((b, a) => {
      let [year_a, month_a] = a.split(' '),
        [year_b, month_b] = b.split(' ');
      if (year_a !== year_b) {
        return Number(year_a) - Number(year_b);
      }
      return MONTH_ABBR.indexOf(month_a) - MONTH_ABBR.indexOf(month_b);
    });
  }

  static getHigherTiers(tier) {
    let highers = [];
    while (tier > 0) {
      tier--;
      highers.push(tier);
    }
    return highers;
  }

  static getLowerTiers(tier) {
    let lowers = [];
    while (tier < 3) {
      tier++;
      lowers.push(tier)
    }
    return lowers;
  }

  static calculate(accum, period, plat, tier, cur, prev) {
    let tk = tier_key(tier), highers = this.getHigherTiers(tier), lowers = this.getLowerTiers(tier);
    let sets = cur[plat][tk], tmp = baseChurnCount(), prev_sets = prev[plat][tk];
    tmp.created = sets.created.size;
    tmp.end = sets.end.size;
    tmp.canceled = sets.canceled.size;
    tmp.inactive = sets.inactive.size;

    tmp.start = prev_sets.end.size;
    tmp.gainByUp = Array.from(sets.end).filter(x => lowers.some(lt => prev[plat][tier_key(lt)].end.has(x))).length;
    tmp.gainByDown = Array.from(sets.end).filter(x => highers.some(lt => prev[plat][tier_key(lt)].end.has(x))).length;
    tmp.lostToUp = Array.from(prev_sets.end).filter(x => highers.some(lt => cur[plat][tier_key(lt)].end.has(x))).length;
    tmp.lostToDown = Array.from(prev_sets.end).filter(x => lowers.some(lt => cur[plat][tier_key(lt)].end.has(x))).length;
    accum[period][plat][tk] = tmp;
    return tmp;
  }

  static stat(monthly: ChurnSets , quarterly: ChurnSets, yearly: ChurnSets) {
    this.yearly = {} as ChurnCount;
    this.years.forEach((year, index) => {
      let cur = yearly[year] || defaultChurnValue();
      this.yearly[year] = {} as PeriodChurnCount;
      let prev_year = this.years[index + 1];
      let prev = yearly[prev_year] || defaultChurnValue();
      ['qm', 'bm', 'both'].forEach((plat: keyof PlatformPeriodChurnSets) => {
        this.yearly[year][plat] = {} as PlatformPeriodChurnCount;
        [0, 1, 2, 3].forEach(tier => {
          let tmp = this.calculate(this.yearly, year, plat, tier, cur, prev);
          // let total_lost = tmp.canceled + tmp.lostToDown + tmp.lostToUp;
          // let total_gained = tmp.created + tmp.gainByDown;
        })
      })
    });

    this.quarterly = {} as ChurnCount;
    this.quarters.forEach((quarter, index) => {
      let cur = quarterly[quarter] || defaultChurnValue();
      this.quarterly[quarter] = {} as PeriodChurnCount;
      let prev_quarter = this.quarters[index + 1];
      let prev = quarterly[prev_quarter] || defaultChurnValue();
      ['qm', 'bm', 'both'].forEach((plat: keyof PlatformPeriodChurnSets) => {
        this.quarterly[quarter][plat] = {} as PlatformPeriodChurnCount;
        [0, 1, 2, 3].forEach(tier => {
          let tmp = this.calculate(this.quarterly, quarter, plat, tier, cur, prev);
        })
      })
    });

    this.monthly = {} as ChurnCount;
    this.months.forEach((month, index) => {
      let cur = monthly[month] || defaultChurnValue();
      this.monthly[month] = {} as PeriodChurnCount;
      let prev_month = this.months[index + 1];
      let prev = monthly[prev_month] || defaultChurnValue();
      ['qm', 'bm', 'both'].forEach((plat: keyof PlatformPeriodChurnSets) => {
        this.monthly[month][plat] = {} as PlatformPeriodChurnCount;
        [0, 1, 2, 3].forEach(tier => {
          let tmp = this.calculate(this.monthly, month, plat, tier, cur, prev);
        })
      })
    });
  }
}
