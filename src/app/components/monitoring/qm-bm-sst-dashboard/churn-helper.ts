import {Helper} from "../../../classes/helper";
import {KPIPeriodOptions, PlatformOptions} from "./qm-bm-sst-dashboard.component";

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PLATFORMS = ['qm', 'bm', 'both'];

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


interface BaseIdSets {
  canceled: Set<string>, created: Set<string>, inactive: Set<string>,
  tier_0: Set<string>, tier_1: Set<string>, tier_2: Set<string>, tier_3: Set<string>
}

interface PlatformIdSets {
  bm: BaseIdSets,
  qm: BaseIdSets,
  both: BaseIdSets
}


const init_period_platform_id_sets = (): PlatformIdSets => {
  const base = (): BaseIdSets => ({
    canceled: new Set(), created: new Set(), inactive: new Set(),
    tier_0: new Set(), tier_1: new Set(), tier_2: new Set(), tier_3: new Set()
  });
  return {bm: base(), qm: base(), both: base()};
}

interface InactivePlatformIdSets {
  bm: Set<string>, qm: Set<string>, both: Set<string>
}

const init_inactive_platform_id_sets = (): InactivePlatformIdSets => {
  return {bm: new Set(), qm: new Set(), both: new Set()}
}

interface BaseChurnCount {
  start: number, // RTs at duration start
  pureStart: number,
  end: number, // RTs at duration end
  pureEnd: number,
  lostToHigher: number, // cur tier to higher tier
  gainByUp: number, // from higher tier to cur tier
  lostToLower: number, // cur tier to lower tier
  gainByDown: number, // from lower tier to cur tier
  canceled: number, // RTs disabled in duration
  activated: number, // RTs with orders count low to 0 from prev 1+
  deactivated: number, // RTs with orders up to 1+ from prev 0
  created: number, // RTs newly created in duration
  pureLostToLower: number, // cur tier to lower tier (exclude inactive ones)
  pureLostToHigher: number,
  pureGainByDown: number, // high tier to cur tier (exclude inactive ones)
  pureGainByUp: number,
  pureCanceled: number,
  pureCreated: number,
  lost: any[],
  gained: any[],
  pureLosts: any[],
  pureGains: any[]
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

interface BaseOrderCount {
  bm: number, qm: number, both: number
}

interface RTOrderCount {
  [rt_union_id: string]: BaseOrderCount
}

interface PeriodicRTOrderCount {
  [period: string]: RTOrderCount
}

interface BaseInOutRTs {
  created: Set<string>,
  disabled: Set<string>
}

interface PlatformInOutRTs {
  bm: BaseInOutRTs,
  qm: BaseInOutRTs,
  both: BaseInOutRTs
}


class SetHelper {
  static difference(setA, setB) {
    let _difference = new Set(setA)
    for (let elem of setB) {
      _difference.delete(elem)
    }
    return _difference
  }

  static union(setA, setB) {
    let _union = new Set(setA)
    for (let elem of setB) {
      _union.add(elem)
    }
    return _union
  }

  static intersection(setA, setB) {
    let _intersection = new Set()
    for (let elem of setB) {
      if (setA.has(elem)) {
        _intersection.add(elem)
      }
    }
    return _intersection
  }

  static symmetricDifference(setA, setB) {
    let _difference = new Set(setA)
    for (let elem of setB) {
      if (_difference.has(elem)) {
        _difference.delete(elem)
      } else {
        _difference.add(elem)
      }
    }
    return _difference
  }

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

const tier_key = t => `tier_${t}` as keyof PlatformPeriodChurnSets


const baseChurnCount = (): BaseChurnCount => {
  let obj = {} as BaseChurnCount;
  ["start", "end", "canceled", "created", "lostToHigher", "gainByUp", "lostToLower", "gainByDown", "inactive"].forEach(key => {
    obj[key] = 0;
  })
  obj.lost = [];
  obj.gained = [];
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

const timestamp_start = (period: string) => {
  let date: Date;
  if (/^\d{4}$/.test(period)) {
    date = new Date(Date.UTC(Number(period), 0));
  } else if (period.includes('Q')) {
    let [y, q] = period.split(' ');
    let m = 3 * (Number(q.substr(1)) - 1);
    date = new Date(Date.UTC(2000 + Number(y), m));
  } else {
    let [y, m] = period.split(' ');
    date = new Date(Date.UTC(2000 + Number(y), MONTH_ABBR.indexOf(m)));
  }
  return date.valueOf();
}

const timestamp_end = (period: string) => {
  let date: Date;
  if (/^\d{4}$/.test(period)) {
    // set to next year
    date = new Date(Date.UTC(Number(period) + 1, 0));
  } else if (period.includes('Q')) {
    let [y, q] = period.split(' ');
    let m = 3 * (Number(q.substr(1)) - 1);
    date = new Date(Date.UTC(2000 + Number(y), m));
    // set to next quarter
    date.setMonth(date.getMonth() + 3);
  } else {
    let [y, m] = period.split(' ');
    date = new Date(Date.UTC(2000 + Number(y), MONTH_ABBR.indexOf(m)));
    // set next month
    date.setMonth(date.getMonth() + 1);
  }
  // set to end time of current period
  date.setMilliseconds(date.getMilliseconds() - 1);
  return date.valueOf();
}

const utc_yqm_keys = (date) => {
  let [y, m] = new Date(date).toISOString().split('T')[0].split('-'), n_y = Number(y), n_m = Number(m);
  let q = Math.ceil(n_m / 3), shortYear = y.substr(2);
  let month = shortYear + ' ' + MONTH_ABBR[n_m - 1], quarter = shortYear + ' ' + 'Q' + q;
  return {month, quarter, year: y, year_number: n_y, month_number: n_m}
}

const tier_move = (from, to) => [from ? `Tier ${from}` : 'VIP', ' -> ', to ? `Tier ${to}` : 'VIP'].join('')

export default class ChurnHelper {

  static earliest_time = new Date().valueOf();

  static years: string[] = [];
  static quarters: string[] = [];
  static months: string[] = [];

  static yearly: ChurnCount = {};
  static quarterly: ChurnCount = {};
  static monthly: ChurnCount = {};

  static unified_rts_dates = {};
  static union_rts_dict = {};

  static qm_rts_activity = {};

  static getList({platform, period_type, tier}) {
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

  static accumulate_periodic(union_rt_dict, bm_data, qm_data) {
    let earliest = new Date().valueOf();

    const inactive = {monthly: {}, quarterly: {}, yearly: {}};
    const accumulate_inactive = (accumulated, period, platform, union_id) => {
      let tmp = accumulated[period] || init_inactive_platform_id_sets();
      tmp[platform].add(union_id);
      accumulated[period] = tmp;
    };

    const activities = {
      monthly: {} as PeriodicRTOrderCount,
      quarterly: {} as PeriodicRTOrderCount,
      yearly: {} as PeriodicRTOrderCount
    };
    const cur_mon = new Date().getMonth() + 1, cur_year = new Date().getFullYear();
    const first_accumulate = (accumulated, period, count, union_id) => {
      let tmp = accumulated[period] || {} as RTOrderCount;
      tmp[union_id] = {bm: count, both: count, qm: 0} as BaseOrderCount;
      accumulated[period] = tmp;
    };

    let latest_complete_month_counts = {}
    bm_data.sort((a, b) => new Date(a.month).valueOf() - new Date(b.month).valueOf()).forEach(({bmid, month: month_date, count_orders}) => {
      earliest = Math.min(earliest, new Date(month_date).valueOf())
      let {month, quarter, year, year_number: n_y, month_number: n_m} = utc_yqm_keys(month_date)
      let union_id = union_rt_dict.bm[bmid], count = count_orders;
      let is_latest_month = n_y === cur_year && n_m === cur_mon;
      if (union_id) {
        // for current month, we use previous month's data since we do not have the ordersInLast30d data for BM
        if (is_latest_month) {
          count = latest_complete_month_counts[bmid] || 0;
        } else {
          latest_complete_month_counts[bmid] = count;
        }
        first_accumulate(activities.monthly, month, count, union_id);
        if (!count) {
          // collect inactive data (RT's with 0 orders in this month)
          accumulate_inactive(inactive.monthly, month, 'bm', union_id);
        }

        if (n_m % 3 === 0 || is_latest_month) {
          first_accumulate(activities.quarterly, quarter, count, union_id);
          if (!count) {
            accumulate_inactive(inactive.quarterly, quarter, 'bm', union_id);
          }
        }
        if (n_m === 12 || is_latest_month) {
          first_accumulate(activities.yearly, year, count, union_id);
          if (!count) {
            accumulate_inactive(inactive.yearly, year, 'bm', union_id);
          }
        }
      }
    });
    const second_accumulate = (accumulated, period, count, union_id) => {
      let tmp = accumulated[period] || {} as RTOrderCount;
      let tmp_rt = tmp[union_id] || {bm: 0, both: 0, qm: 0} as BaseOrderCount;
      tmp_rt.qm = count;
      tmp_rt.both += count;
      tmp[union_id] = tmp_rt;
      accumulated[period] = tmp;
      return tmp_rt.both;
    };
    qm_data.forEach(({qmid, month: month_date, count_orders}) => {
      earliest = Math.min(earliest, new Date(month_date).valueOf())
      let {month, quarter, year, year_number: n_y, month_number: n_m} = utc_yqm_keys(month_date)
      let union_id = union_rt_dict.qm[qmid];
      let is_latest_month = n_y === cur_year && n_m === cur_mon;
      if (union_id) {
        let count = count_orders;
        // for current(latest, actually uncompleted) month, we use ordersInLast30d
        if (is_latest_month) {
          count = this.qm_rts_activity[qmid] || 0;
        }
        let both_m_count = second_accumulate(activities.monthly, month, count, union_id);
        if (!count) {
          accumulate_inactive(inactive.monthly, month, 'qm', union_id);
        }
        if (!both_m_count) {
          accumulate_inactive(inactive.monthly, month, 'both', union_id);
        }

        if (n_m % 3 === 0 || is_latest_month) {
          let both_q_count = second_accumulate(activities.quarterly, quarter, count, union_id);
          if (!count_orders) {
            accumulate_inactive(inactive.quarterly, quarter, 'qm', union_id);
          }
          if (!both_q_count) {
            accumulate_inactive(inactive.quarterly, quarter, 'both', union_id);
          }
        }
        if (n_m === 12 || is_latest_month) {
          let both_y_count = second_accumulate(activities.yearly, year, count, union_id);
          if (!count_orders) {
            accumulate_inactive(inactive.yearly, year, 'qm', union_id);
          }

          if (!both_y_count) {
            accumulate_inactive(inactive.yearly, year, 'both', union_id);
          }
        }
      }
    });
    this.earliest_time = earliest;
    return activities
  }

  static accumulate_status(union_rts, union_rt_dict) {

    const base_in_out = (): PlatformInOutRTs => ({
      bm: {created: new Set(), disabled: new Set()},
      qm: {created: new Set(), disabled: new Set()},
      both: {created: new Set(), disabled: new Set()}
    });

    const accumulate = (accumulated, date, platform, key, union_id) => {
      let periods = utc_yqm_keys(date);
      ['month', 'quarter', 'year'].forEach(type => {
        let tmp = accumulated[`${type}ly`][periods[type]] || base_in_out();
        tmp[platform][key].add(union_id);
        accumulated[`${type}ly`][periods[type]] = tmp;
      });
    }

    const inout = { monthly: {}, quarterly: {}, yearly: {} }
    // 2. collect all created and disabled RTs periodic  get the earliest time to stat
    union_rts.forEach(({_id, disabledAt, createdAt, _bid, bdisabledAt, bcreatedAt}) => {
      let q_union_id = union_rt_dict.qm[_id];
      let last_disabled_at = -Infinity, first_created_at = Infinity;
      if (q_union_id) {

        if (createdAt) {
          // since we only have data from 2018-01, no need to check earlier time;
          // this.earliest_time = Math.min(this.earliest_time, new Date(createdAt).valueOf());
          first_created_at = Math.min(new Date(createdAt).valueOf(), first_created_at);
          accumulate(inout, createdAt, 'qm', 'created', q_union_id);
        }
        if (disabledAt) {
          last_disabled_at = Math.max(new Date(disabledAt).valueOf(), last_disabled_at);
          accumulate(inout, disabledAt, 'qm', 'disabled', q_union_id);
        }

        this.unified_rts_dates[q_union_id] = {qm: {createdAt, disabledAt}, bm: {}, both: {}};
      }
      let b_union_id = union_rt_dict.bm[(_bid || '').toString()];
      if (b_union_id) {
        if (bcreatedAt) {
          // since we only have data from 2018-01, no need to check earlier time
          // this.earliest_time = Math.min(this.earliest_time, new Date(bcreatedAt).valueOf());
          first_created_at = Math.min(first_created_at, new Date(bcreatedAt).valueOf());
          accumulate(inout, bcreatedAt, 'bm', 'created', b_union_id);
        }
        if (bdisabledAt) {
          last_disabled_at = Math.max(last_disabled_at, new Date(bdisabledAt).valueOf());
          accumulate(inout, bdisabledAt, 'bm', 'disabled', b_union_id);
        }
        let tmp = this.unified_rts_dates[b_union_id] || {qm: {}, bm: {}, both: {}};
        tmp.bm =  {createdAt: bcreatedAt, disabledAt: bdisabledAt};
        this.unified_rts_dates[b_union_id] = tmp;
      }

      if (q_union_id || b_union_id) {

        if (first_created_at !== Infinity) {
          accumulate(inout, first_created_at, 'both', 'created', q_union_id || b_union_id);
        } else {
          first_created_at = undefined;
        }

        if (last_disabled_at !== -Infinity) {
          accumulate(inout, last_disabled_at, 'both', 'disabled', q_union_id || b_union_id);
        } else {
          last_disabled_at = undefined;
        }

        this.unified_rts_dates[q_union_id || b_union_id].both = {createdAt: first_created_at, disabledAt: last_disabled_at}
      }

    });

    return inout;
  }

  static preprocess(union_rts, union_rt_dict, bm_data, qm_data) {
    Object.entries(union_rt_dict).forEach(([plat, dict]) => {
      Object.entries(dict).forEach(([plat_id, union_id]) => {
        if (!this.union_rts_dict[union_id]) {
          this.union_rts_dict[union_id] = {};
        }
        this.union_rts_dict[union_id][plat] = plat_id;
      })
    });
    union_rts.forEach(({_id, activity}) => {
      if (_id) {
        this.qm_rts_activity[_id] = activity || 0;
      }
    });
    // 1. collect activity data periodic
    let activities = this.accumulate_periodic(union_rt_dict, bm_data, qm_data);

    // 2. collect created and disabled RT data periodic
    let inout = this.accumulate_status(union_rts, union_rt_dict);

    // 3. generate all periods (months, quarters, years)
    this.generate_periods();

    // 4. loop all periods and fill rts in them and count
    let prev = init_period_platform_id_sets();
    this.months.forEach(month => {
      prev = this.periodic_calculate(activities, inout, 'monthly', month, prev);
    });

    prev = init_period_platform_id_sets();
    this.quarters.forEach(quarter => {
      prev = this.periodic_calculate(activities, inout, 'quarterly', quarter, prev);
    });

    prev = init_period_platform_id_sets();
    this.years.forEach(year => {
      prev = this.periodic_calculate(activities, inout, 'yearly', year, prev);
    });
  }

  static fill_empty(cur, period, tiers, activity) {
    let period_end = timestamp_end(period);
    Object.entries(this.unified_rts_dates).forEach(([union_id, rest]) => {
      PLATFORMS.forEach(plat => {
        let { createdAt, disabledAt } = rest[plat];
        if (createdAt && new Date(createdAt).valueOf() <= period_end) {
          let exist = tiers[plat].some(set => set.has(union_id));
          if (!exist) {
            // add newly to tier_3 by default
            tiers[plat][3].add(union_id);
          }
          if (disabledAt && new Date(disabledAt).valueOf() <= period_end) {
            // remove deleted
            tiers[plat].forEach(set => set.delete(union_id));
          } else {
            // for inactive RT
            if (!activity || !activity[union_id] || !activity[union_id][plat]) {
              cur[plat].inactive.add(union_id);
            }
          }
        }
      });
    });

    return cur;
  }

  static periodic_calculate(activities, inout, field, period, prev) {
    let activity = activities[field][period], in_out = inout[field][period];
    let cur = init_period_platform_id_sets();
    this[field][period] = {} as PeriodChurnCount;
    PLATFORMS.forEach(plat => {
      if (in_out) {
        cur[plat].canceled = new Set([...in_out[plat].disabled]);
        cur[plat].created = new Set([...in_out[plat].created]);
      }
    });
    let tiers = {
      qm: [new Set(), new Set(), new Set(), new Set()],
      bm: [new Set(), new Set(), new Set(), new Set()],
      both: [new Set(), new Set(), new Set(), new Set()]
    };
    let period_start = timestamp_start(period), period_end = timestamp_end(period);
    if (activity) {
      Object.entries(activity).forEach(([union_id, counts]) => {
        PLATFORMS.forEach(plat => {
          if (this.union_rts_dict[union_id] && (this.union_rts_dict[union_id][plat] || plat === 'both')) {
            if (this.unified_rts_dates[union_id]) {
              let { createdAt, disabledAt } = this.unified_rts_dates[union_id][plat];
              let uncreated = createdAt && new Date(createdAt).valueOf() > period_end;
              let deleted = disabledAt && new Date(disabledAt).valueOf() < period_start;
              if (!uncreated && !deleted) {
                let tier = Helper.getTier(counts[plat]);
                tiers[plat][tier].add(union_id);
              }
            } else {
              let tier = Helper.getTier(counts[plat]);
              tiers[plat][tier].add(union_id);
            }
          }
        });
      });
    }
    // fill all empty parts
    this.fill_empty(cur, period, tiers, activity);

    // calculate count and changes
    PLATFORMS.forEach((plat) => {
      tiers[plat].forEach((set, tier) => {
        cur[plat][tier_key(tier)] = SetHelper.difference(tiers[plat][tier], cur[plat].canceled)
      });
      this[field][period][plat] = this.calculate(cur[plat], prev[plat]);
    });
    return cur;
  }

  static calculate(cur, prev) {
    let plat_period_churn = {} as PlatformPeriodChurnCount;
    let { created, inactive, canceled, ...tiers } = cur;

    [0, 1, 2, 3].forEach(tier => {
      let tmp = baseChurnCount(), tk = tier_key(tier);
      let highers = this.getHigherTiers(tier), lowers = this.getLowerTiers(tier);
      let cur_ends = tiers[tk];
      let cur_created = Array.from(created).filter(x => cur_ends.has(x));
      tmp.created = cur_created.length;
      let pure_cur_created = cur_created.filter(x => !inactive.has(x));
      tmp.pureCreated = pure_cur_created.length;

      let prev_ends = prev[tk];
      // since tier_3 includes inactive data, we need to deduplicate these rts
      let cur_inactivated = Array.from(inactive).filter(x => prev_ends.has(x) && !prev.inactive.has(x));
      tmp.deactivated = cur_inactivated.length;

      let cur_canceled = Array.from(canceled).filter(x => prev_ends.has(x));
      tmp.canceled = cur_canceled.length;
      let pure_cur_canceled = cur_canceled.filter(x => !prev.inactive.has(x));
      tmp.pureCanceled = pure_cur_canceled.length;
      tmp.start = prev_ends.size;
      tmp.end = cur_ends.size;
      let pure_cur_ends = Array.from(cur_ends).filter(x => !inactive.has(x));
      tmp.pureEnd = pure_cur_ends.length;
      let cur_activated = Array.from(pure_cur_ends).filter(x => prev.inactive.has(x));
      tmp.activated = cur_activated.length;


      tmp.pureStart = Array.from(prev_ends).filter(x => !prev.inactive.has(x)).length;

      let losts = {}, gains = {}, pure_losts = {}, pure_gains = {};
      highers.forEach(h => {
        losts[tier_move(tier, h)] = Array.from(prev_ends).filter(x => tiers[tier_key(h)].has(x)).length;
        pure_losts[tier_move(tier, h)] = Array.from(prev_ends).filter(x => !prev.inactive.has(x) && tiers[tier_key(h)].has(x)).length;
        gains[tier_move(h, tier)] = Array.from(cur_ends).filter(x => prev[tier_key(h)].has(x)).length;
        pure_gains[tier_move(h, tier)] = Array.from(cur_ends).filter(x => !inactive.has(x) && prev[tier_key(h)].has(x)).length;
      });
      lowers.forEach(l => {
        losts[tier_move(tier, l)] = Array.from(prev_ends).filter(x => tiers[tier_key(l)].has(x)).length;
        pure_losts[tier_move(tier, l)] = Array.from(prev_ends).filter(x => !inactive.has(x) && tiers[tier_key(l)].has(x)).length;
        gains[tier_move(l, tier)] = Array.from(cur_ends).filter(x => prev[tier_key(l)].has(x)).length;
        pure_gains[tier_move(l, tier)] = Array.from(cur_ends).filter(x => !prev.inactive.has(x) && prev[tier_key(l)].has(x)).length;
      });

      tmp.lost = Object.entries(losts).map(([path, count]) => ({path, count}));
      tmp.pureLosts = Object.entries(pure_losts).map(([path, count]) => ({path, count}));
      tmp.gained = Object.entries(gains).map(([path, count]) => ({path, count}));
      tmp.pureGains = Object.entries(pure_gains).map(([path, count]) => ({path, count}));

      // rts from lower tiers to current tier
      let gainByUp = Array.from(cur_ends).filter(x => lowers.some(lt => prev[tier_key(lt)].has(x)));
      tmp.gainByUp = gainByUp.length;
      let pureGainByUp = gainByUp.filter(x => !prev.inactive.has(x));
      tmp.pureGainByUp = pureGainByUp.length;
      // rts from higher tiers to current tier
      let gainByDown = Array.from(cur_ends).filter(x => highers.some(ht => prev[tier_key(ht)].has(x)));
      tmp.gainByDown = gainByDown.length;
      let pureGainByDown = gainByDown.filter(x => !inactive.has(x));
      tmp.pureGainByDown = pureGainByDown.length;
      // rts from current tier to higher tiers
      let lostToHigher = Array.from(prev_ends).filter(x => highers.some(ht => tiers[tier_key(ht)].has(x)));
      tmp.lostToHigher = lostToHigher.length;
      let pureLostToHigher = lostToHigher.filter(x => !prev.inactive.has(x));
      tmp.pureLostToHigher = pureLostToHigher.length;
      // rts from current tier to lower tiers
      let lostToLower = Array.from(prev_ends).filter(x => lowers.some(lt => tiers[tier_key(lt)].has(x)));
      tmp.lostToLower = lostToLower.length;
      let pureLostToLower = lostToLower.filter(x => !inactive.has(x));
      tmp.pureLostToLower = pureLostToLower.length;

      plat_period_churn[tk] = tmp;
    });
    return plat_period_churn;
  }

  static generate_periods() {
    const years = new Set(), quarters = new Set(), months = new Set();
    let cursor = new Date(this.earliest_time), now = new Date();
    while (cursor.valueOf() < now.valueOf()) {
      let { year, month, quarter } = getDurationKeys(getYM(cursor));
      years.add(year);
      quarters.add(quarter);
      months.add(month);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    this.years = Array.from(years).sort((a, b) => Number(a) - Number(b));
    this.quarters = Array.from(quarters).sort((a, b) => {
      let [year_a, quarter_a] = a.split(' '),
        [year_b, quarter_b] = b.split(' ');
      if (year_a !== year_b) {
        return Number(year_a) - Number(year_b);
      }
      return Number(quarter_a.substr(1)) - Number(quarter_b.substr(1));
    });
    this.months = Array.from(months).sort((a, b) => {
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

}
