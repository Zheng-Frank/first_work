
const BLANK = " ";
const ZERO = '0';

const Constants = {
  TYPE_OF_RECORD: "MC",
  REPORT_AMOUNTCODES: "1256789ABCDEFG",
  TIN_TYPE_EIN: "1",
  TIN_TYPE_SSN: "2",
  MERCHANT_CATEGORY_CODE: "5812"
}

interface Field {
  name: string, // field name
  index: number, // field index
  length: number, // field value length
  blank?: boolean, // if field value is blank
  email?: boolean, // if field value is email
  numeric?: boolean // if field value is number
}

const TFields: Field[] = [
  {name: "type", index: 0, length: 1},
  // 4-character record of the tax year
  {name: "PaymentYear", index: 1, length: 4},
  // empty space (1 character)
  {name: "PriorYearIndicator", index: 2, length: 1, blank: true},
  // no dash, Qmenu TIN
  {name: "TransmitterTIN", index: 3, length: 9},
  // TCC (once we receive this from IRS) ...NOTE: in this case, no spaces between this TCC and EIN before it
  {name: "TransmitterControlCode", index: 4, length: 5},
  {name: "Blank", index: 5, length: 7, blank: true},
  {name: "TestFileIndicator", index: 6, length: 1, blank: true},
  {name: "ForeignEntityIndicator", index: 7, length: 1, blank: true},
  // Name of one of the people set up on the account (e.g. authorized user), fill in with spaces up to 80 chararcters
  {name: "TransmitterName", index: 8, length: 80},
  {name: "CompanyName", index: 9, length: 80},
  {name: "CompanyAddress", index: 10, length: 40},
  {name: "CompanyCity", index: 11, length: 40},
  {name: "CompanyState", index: 12, length: 2},
  {name: "CompanyZipcode", index: 13, length: 9},
  {name: "Blank", index: 14, length: 15},
  {name: "TotalPayees", index: 15, length: 8, numeric: true},
  {name: "CompanyContactName", index: 16, length: 40},
  {name: "CompanyContactPhone", index: 17, length: 15},
  {name: "CompanyContactEmail", index: 18, length: 50, email: true},
  {name: "Blank", index: 19, length: 91, blank: true},
  {name: "RecordSequenceNumber", index: 20, length: 8, numeric: true},
  {name: "Blank", index: 21, length: 10},
  {name: "VendorIndicator", index: 22, length: 1},
  {name: "VendorName", index: 23, length: 40},
  {name: "VendorAddress", index: 24, length: 40},
  {name: "VendorCity", index: 25, length: 40},
  {name: "VendorState", index: 26, length: 2},
  {name: "VendorZipcode", index: 27, length: 9},
  {name: "VendorContactName", index: 28, length: 40},
  {name: "VendorContactPhone", index: 29, length: 15},
  {name: "Blank", index: 30, length: 35},
  {name: "VendorForeignEntityIndicator", index: 31, length: 1},
  {name: "Blank", index: 32, length: 8, blank: true},
]

const AFields: Field[] = [
  {name: "type", index: 0, length: 1},
  {name: "PaymentYear", index: 1, length: 4},
  {name: "CFSF", index: 2, length: 1},
  {name: "Blank", index: 3, length: 5, blank: true},
  {name: "PayerTIN", index: 4, length: 9},
  {name: "PayerNameControl", index: 5, length: 4},
  {name: "LastFilingIndicator", index: 6, length: 1, blank: true},
  {name: "TypeOfReturn", index: 7, length: 2},
  {name: "AmountCodes", index: 8, length: 16},
  {name: "Blank", index: 9, length: 8, blank: true},
  {name: "ForeignEntityIndicator", index: 10, length: 1},
  {name: "PayerName", index: 11, length: 80},
  {name: "TransferAgentIndicator", index: 12, length: 1},
  {name: "PayerAddress", index: 13, length: 40},
  {name: "PayerCity", index: 14, length: 40},
  {name: "PayerState", index: 15, length: 2},
  {name: "PayerZipcode", index: 16, length: 9},
  {name: "PayerPhone", index: 17, length: 15},
  {name: "Blank", index: 18, length: 260},
  {name: "RecordSequenceNumber", index: 19, length: 8, numeric: true},
  {name: "Blank", index: 20, length: 241, blank: true},
]

const BFields: Field[] = [
  {name: "type", index: 0, length: 1},
  {name: "PaymentYear", index: 1, length: 4},
  {name: "CorrectionIndicator", index: 2, length: 1, blank: true},
  {name: "PayeeNameControl", index: 3, length: 4},
  {name: "PayeeTINType", index: 4, length: 1},
  {name: "PayeeTIN", index: 5, length: 9},
  // like the RT Mongo DB (up to 20 chars,
  // maybe use last 20 chars instead of first 20 to ensure uniqueness,
  // whatever is better at ensuring uniqueness!)
  {name: "PayerAccountNumber", index: 6, length: 20},
  {name: "PayerOfficeCode", index: 7, length: 4, blank: true},
  {name: "Blank", index: 8, length: 10, blank: true},
  // the generated 1099K fields start here!...
  {name: "GrossAmount", index: 9, length: 12, numeric: true},
  {name: "CardNotPresentTransactions", index: 10, length: 12, numeric: true},
  {name: "Blank", index: 11, length: 12, numeric: true, blank: true},
  {name: "FederalTaxWithheld", index: 12, length: 12, numeric: true, blank: true},
  {name: "JanAmount", index: 13, length: 12, numeric: true},
  {name: "FebAmount", index: 14, length: 12, numeric: true},
  {name: "MarAmount", index: 15, length: 12, numeric: true},
  {name: "AprAmount", index: 16, length: 12, numeric: true},
  {name: "MayAmount", index: 17, length: 12, numeric: true},
  {name: "JunAmount", index: 18, length: 12, numeric: true},
  {name: "JulAmount", index: 19, length: 12, numeric: true},
  {name: "AugAmount", index: 20, length: 12, numeric: true},
  {name: "SepAmount", index: 21, length: 12, numeric: true},
  {name: "OctAmount", index: 22, length: 12, numeric: true},
  {name: "NovAmount", index: 23, length: 12, numeric: true},
  {name: "DecAmount", index: 24, length: 12, numeric: true},
  {name: "ForeignCountryIndicator", index: 25, length: 1, blank: true},
  {name: "PayeeName", index: 26, length: 40},
  {name: "SecondPayeeName", index: 27, length: 40, blank: true},
  {name: "Blank", index: 28, length: 40, blank: true},

  {name: "PayeeAddress", index: 29, length: 40},
  {name: "Blank", index: 30, length: 40, blank: true},
  {name: "PayeeCity", index: 31, length: 40},
  {name: "PayeeState", index: 32, length: 2},
  {name: "PayeeZipcode", index: 33, length: 9},

  {name: "Blank", index: 34, length: 1, blank: true},
  // row number (on ALL rows, not just B-record rows!!!) (check out row_numbers_all_match_to_the_end screenshot on trello card 799)
  {name: "RecordSequenceNumber", index: 35, length: 8, numeric: true},
  {name: "Blank", index: 36, length: 36, blank: true},

  {name: "SecondTINNotice", index: 37, length: 1},
  {name: "Blank", index: 38, length: 2, blank: true},
  {name: "TypeOfFiler", index: 39, length: 1},
  {name: "TypeOfPayment", index: 40, length: 1},

  {name: "NumberOfTransactions", index: 41, length: 13, numeric: true},
  {name: "Blank", index: 42, length: 3, blank: true},

  {name: "PSENameAndPhone", index: 43, length: 40},
  {name: "MerchantCategoryCode", index: 44, length: 4},

  {name: "Blank", index: 45, length: 54, blank: true},
  {name: "SpecialDataEntries", index: 46, length: 60, blank: true},
  {name: "StateIncomeTaxWithheld", index: 47, length: 12, numeric: true, blank: true},
  {name: "LocalIncomeTaxWithheld", index: 48, length: 12, numeric: true, blank: true},
  {name: "CFSCCode", index: 49, length: 2},
]

// this is all the B fields summed up
const CFields: Field[] = [
  {name: "type", index: 0, length: 1},
  {name: "NumberOfPayees", index: 1, length: 8, numeric: true},
  {name: "Blank", index: 2, length: 6, blank: true},

  {name: "GrossAmount", index: 3, length: 18, numeric: true},
  {name: "CardNotPresentTransactions", index: 4, length: 18, numeric: true},
  {name: "Blank", index: 5, length: 18, numeric: true, blank: true},
  {name: "FederalTaxWithheld", index: 6, length: 18, numeric: true, blank: true},
  {name: "JanAmount", index: 7, length: 18, numeric: true},
  {name: "FebAmount", index: 8, length: 18, numeric: true},
  {name: "MarAmount", index: 9, length: 18, numeric: true},
  {name: "AprAmount", index: 10, length: 18, numeric: true},
  {name: "MayAmount", index: 11, length: 18, numeric: true},
  {name: "JunAmount", index: 12, length: 18, numeric: true},
  {name: "JulAmount", index: 13, length: 18, numeric: true},
  {name: "AugAmount", index: 14, length: 18, numeric: true},
  {name: "SepAmount", index: 15, length: 18, numeric: true},
  {name: "OctAmount", index: 16, length: 18, numeric: true},
  {name: "NovAmount", index: 18, length: 18, numeric: true},
  {name: "DecAmount", index: 19, length: 18, numeric: true},
  {name: "Blank", index: 20, length: 196, blank: true},
  {name: "RecordSequenceNumber", index: 21, length: 8, numeric: true},
  {name: "Blank", index: 22, length: 241, blank: true},
]

const KFields: Field[] = [
  {name: "type", index: 0, length: 1},
  {name: "NumberOfPayees", index: 1, length: 8, numeric: true},
  {name: "Blank", index: 2, length: 6, blank: true},

  {name: "GrossAmount", index: 3, length: 18, numeric: true},
  {name: "CardNotPresentTransactions", index: 4, length: 18, numeric: true},
  {name: "Blank", index: 5, length: 18, numeric: true, blank: true},
  {name: "FederalTaxWithheld", index: 6, length: 18, numeric: true, blank: true},

  {name: "JanAmount", index: 7, length: 18, numeric: true},
  {name: "FebAmount", index: 8, length: 18, numeric: true},
  {name: "MarAmount", index: 9, length: 18, numeric: true},
  {name: "AprAmount", index: 10, length: 18, numeric: true},
  {name: "MayAmount", index: 11, length: 18, numeric: true},
  {name: "JunAmount", index: 12, length: 18, numeric: true},
  {name: "JulAmount", index: 13, length: 18, numeric: true},
  {name: "AugAmount", index: 14, length: 18, numeric: true},
  {name: "SepAmount", index: 15, length: 18, numeric: true},
  {name: "OctAmount", index: 16, length: 18, numeric: true},
  {name: "NovAmount", index: 18, length: 18, numeric: true},
  {name: "DecAmount", index: 19, length: 18, numeric: true},

  {name: "Blank", index: 20, length: 196, blank: true},
  {name: "RecordSequenceNumber", index: 21, length: 8, numeric: true},
  {name: "Blank", index: 22, length: 199, blank: true},

  {name: "StateIncomeWithheld", index: 23, length: 18, numeric: true, blank: true},
  {name: "LocalIncomeTaxWithheld", index: 24, length: 18, numeric: true, blank: true},
  {name: "Blank", index: 25, length: 4, blank: true},
  {name: "CFSCCode", index: 26, length: 2},

]

const FFields: Field[] = [
  {name: "type", index: 0, length: 1},
  {name: "NumberOfARecords", index: 1, length: 8, numeric: true},
  {name: "Blank", index: 2, length: 21, blank: true, numeric: true},
  {name: "Blank", index: 3, length: 19, blank: true},
  {name: "TotalNumberOfPayees", index: 4, length: 8, numeric: true},
  {name: "Blank", index: 5, length: 442, blank: true},
  {name: "RecordSequenceNumber", index: 6, length: 8, numeric: true},
  {name: "Blank", index: 7, length: 241, blank: true},
]

const StateCodes = {
  "AL": "01",
  "AZ": "04",
  "AR": "05",
  "CA": "06",
  "CO": "07",
  "CT": "08",
  "DE": "10",
  "GA": "13",
  "HI": "15",
  "ID": "16",
  "IN": "18",
  "KS": "20",
  "LA": "22",
  "ME": "23",
  "MD": "24",
  "MA": "25",
  "MI": "26",
  "MN": "27",
  "MS": "28",
  "MO": "29",
  "MT": "30",
  "NE": "31",
  "NJ": "34",
  "NM": "35",
  "NC": "37",
  "ND": "38",
  "OH": "39",
  "OK": "40",
  "SC": "45",
  "WI": "55"
}

const pad = (value, total, numeric = false) => {
  while (value.toString().length < total) {
    if (numeric) { value = ZERO + value; } else { value += BLANK; }
  }
  return value;
}

const renderRow = (fields, data) => {
  return fields.sort((x, y) => x.index - y.index).map(({name, length, blank, numeric, email}) => {
    let value = (data[name] || '').toString().replace(/\s+/g, ' ').trim().substr(0, length);
    if (blank) {
      value = BLANK;
      if (numeric) {
        value = ZERO;
      }
    }
    // if not email, make value to uppercase
    if (!email) {
      value = value.toUpperCase();
    }
    // for number, pad left with 0, for string, pad right with space
    value = pad(value, length, numeric);
    if (value.length !== length) {
      throw new Error('Value length incorrect!')
    }
    return value;
  }).join('');
}

const Months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const round = (value) => Math.round(Number(value || 0) * 100)

class Renderer {

  static tRow(year, total) {
    let data = {
      type: 'T',
      PaymentYear: year,
      TransmitterTIN: '814208444',
      TransmitterControlCode : "WFIRS",
      TestFileIndicator : "",
      ForeignEntityIndicator : '', // leave empty
      TransmitterName : "Guanghua Sui",
      CompanyName : "QMENU, INC",
      CompanyAddress : "107 Technology Pkwy NW Suite 211",
      CompanyCity : "Peachtree Corners",
      CompanyState : "GA",
      CompanyZipcode : "30092",
      TotalPayees : total,
      CompanyContactName : "Guanghua Sui",
      CompanyContactPhone : "4075807504",
      CompanyContactEmail : "garysui@gmail.com",
      VendorIndicator: 'I',
      VendorName : '',
      VendorAddress : '',
      VendorCity : '',
      VendorState : '',
      VendorZipcode : '',
      VendorContactName : '',
      VendorContactPhone : '',
      VendorForeignEntityIndicator : '',
      RecordSequenceNumber: 1
    }
    return renderRow(TFields, data)
  }

  static aRow(year) {
    let data = {
      type: 'A', CFSF: 1, PaymentYear: year,
      PayerTIN: '814208444', PayerNameControl: '', // leave empty
      TypeOfReturn: Constants.TYPE_OF_RECORD,
      AmountCodes: Constants.REPORT_AMOUNTCODES,
      ForeignEntityIndicator : '',
      PayerName : "QMENU, INC",
      TransferAgentIndicator: '0',
      PayerAddress : "107 Technology Pkwy NW Suite 211",
      PayerCity : "Peachtree Corners",
      PayerState : "GA",
      PayerZipcode : "30092",
      PayerPhone : "4043829768",
      RecordSequenceNumber: 2
    }
    return renderRow(AFields, data)
  }

  static bckfRow(year, list) {
    let sequence = 3, states = {}, rows = [];
    let sum = {type: 'C', GrossAmount: 0, CardNotPresentTransactions: 0, NumberOfPayees: 0};
    list.forEach(item => {
      item.form1099k.filter(x => x.required && x.year === Number(year))
        .forEach(form => {
          // verify data
          let tin = form.periodTin || item.rtTIN,
            payeeName = form.periodPayeeName || item.payeeName;
          if (!tin || !payeeName) {
            throw new Error('One or more restaurants is missing information required to download the FIRE submission. Please fill in all required fields before downloading.')
          }
          let data = {
            type: 'B', PaymentYear: year,
            PayeeNameControl: '', // leave empty
            PayeeTINType: {EIN: '1', SSN: '2'}[form.periodTinType || item.rtTinType] || '1', // default to EIN
            PayeeTIN: tin.replace(/[-\s]/g, ''),
            PayerAccountNumber: item.id.substr(4), // use last 20 chars in _id
            PayeeName: payeeName, // use first 40 chars in case of too long name
            GrossAmount: round(form.total),
            CardNotPresentTransactions: Number(form.transactions || 0),
            PayeeAddress: item.streetAddress, PayeeCity: item.city, PayeeState: item.state,
            PayeeZipcode: item.zipCode, RecordSequenceNumber: sequence++,
            SecondTINNotice: '', TypeOfFiler: '2', TypeOfPayment: '2',
            NumberOfTransactions: Number(form.transactions || 0),
            PSENameAndPhone: '', MerchantCategoryCode: Constants.MERCHANT_CATEGORY_CODE,
            CFSCCode: StateCodes[item.state]
          };
          sum.GrossAmount += data.GrossAmount;
          sum.CardNotPresentTransactions += data.CardNotPresentTransactions;
          sum.NumberOfPayees++;
          let cfsc = StateCodes[item.state];
          if (cfsc) {
            states[item.state] = states[item.state] || {
              type: 'K', GrossAmount: 0, RecordSequenceNumber: 0, NumberOfPayees: 0,
              CFSCCode: cfsc, CardNotPresentTransactions: 0
            }
            states[item.state].GrossAmount += data.GrossAmount;
            states[item.state].NumberOfPayees++;
            states[item.state].CardNotPresentTransactions += data.CardNotPresentTransactions;
          }
          Months.forEach((m, i) => {
            let key = `${m}Amount`;
            data[key] = round(form[`${i}`]);
            sum[key] = (sum[key] || 0) + data[key]
            if (cfsc) {
              states[item.state][key] = (states[item.state][key] || 0) + data[key];
            }
          })
          rows.push(renderRow(BFields, data))
        })
    })
    rows.push(renderRow(CFields, {...sum, RecordSequenceNumber: sequence++}));
    Object.values(states).forEach((value) => {
      rows.push(renderRow(KFields, {...value, RecordSequenceNumber: sequence++}))
    })
    rows.push(renderRow(FFields, {
      type: 'F', NumberOfARecords: 1, TotalNumberOfPayees: sum.NumberOfPayees,
      RecordSequenceNumber: sequence++,
    }))
    return {rows, totalPayees: sum.NumberOfPayees};
  }

}

const download = (year, list) => {
  let { rows, totalPayees } = Renderer.bckfRow(year, list);
  rows.unshift(Renderer.aRow(year))
  rows.unshift(Renderer.tRow(year, totalPayees))
  let blob = new Blob([rows.join('\n')], {type: 'text/plain; charset=utf-8'});
  let node = document.createElement('a');
  node.href = URL.createObjectURL(blob);
  let dt = new Date();
  let y = dt.getFullYear();
  let M =  pad(dt.getMonth() + 1, 2, true)
  let d = pad(dt.getDate(), 2, true)
  let h = pad(dt.getHours(), 2, true)
  let m = pad(dt.getMinutes(), 2, true)
  let s = pad(dt.getSeconds(), 2, true)
  node.download = `${year}-tax-year_Qmenu_FIRE_Submission-created_${[y, M, d, h, m, s].join('_')}.txt`;
  node.click();
  node.remove();
}

export {
  download
}
