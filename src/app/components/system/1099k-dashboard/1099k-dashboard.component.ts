import { Component, OnInit, OnDestroy } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { PDFDocument } from "pdf-lib";
import { TimezoneHelper, Hour } from "@qmenu/ui";

enum openRTOptionTypes {
  All = 'Open now?',
  Open = 'Open',
  Not_Open = 'Not Open'
}

enum missPayeeOptionTypes {
  All = 'Missing Payee?',
  Missing_Payee = 'Missing Payee',
  Has_Payee = 'Has Payee'
}

enum missTINOptionTypes {
  All = 'Missing TIN?',
  Missing_TIN = 'Missing TIN',
  Has_TIN = 'Has TIN'
}

enum missingEmailOptionTypes {
  All = 'Missing Email?',
  Missing_Email = 'Missing Email',
  Has_Email = 'Has Email'
}

enum executionOptionTypes {
  Download = 'Download forms for Qmenu use',
  Send = 'Send forms to all restaurants'
}

@Component({
  selector: "app-1099k-dashboard",
  templateUrl: "./1099k-dashboard.component.html",
  styleUrls: ["./1099k-dashboard.component.scss"]
})
export class Dashboard1099KComponent implements OnInit, OnDestroy {
  rows = [];
  filteredRows = [];
  taxYearOptions = [
    'All',
    // '2022', // taxYear 2022 will need to be enabled beginning in 2023
    '2021',
    '2020',
  ];
  executionYears = [
    '2021',
    '2020',
  ];
  executionYear = '2021';
  openOptions = [openRTOptionTypes.All, openRTOptionTypes.Open, openRTOptionTypes.Not_Open];
  openOption = openRTOptionTypes.All;
  missPayeeOptions = [missPayeeOptionTypes.All, missPayeeOptionTypes.Missing_Payee, missPayeeOptionTypes.Has_Payee];
  missPayeeOption = missPayeeOptionTypes.All;
  missTINOptions = [missTINOptionTypes.All, missTINOptionTypes.Missing_TIN, missTINOptionTypes.Has_TIN];
  missTINOption = missTINOptionTypes.All;
  missingEmailOptions = [missingEmailOptionTypes.All, missingEmailOptionTypes.Missing_Email, missingEmailOptionTypes.Has_Email];
  missingEmailOption = missingEmailOptionTypes.All;
  executionOptions = [executionOptionTypes.Download, executionOptionTypes.Send];
  executionOption = executionOptionTypes.Download;
  bulkFileOperation;
  bulkOperationYear;

  taxYear = 'All';

  searchFilter;

  system: any;
  now: Date = new Date();
  timer;
  refreshDataInterval = 1 * 60 * 1000;
  restaurants = [];
  constructor(private _api: ApiService, private _global: GlobalService) { }

  async ngOnInit() {
    // refresh the page every hour
    this.timer = setInterval(() => {
      this.now = new Date();
      this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
    }, this.refreshDataInterval);
    await this.get1099KData();
    this.filterRows();
  }

  excute() {
    if (this.executionOption === executionOptionTypes.Download) {

    } else {

    }
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async rescan() {
    await this.get1099KData();
    this.filterRows();
  }

  isAdmin() {
    let roles = this._global.user.roles || [];
    return roles.includes('ADMIN');
  }

  debounce(value) {
    this.filterRows();
  }

  async get1099KData() {
    this.restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "form1099k.required": true
      },
      projection: {
        "closedHours": 1,
        "menus.hours": 1,
        name: 1,
        form1099k: 1,
        channels: 1,
        googleAddress: 1,
        people: 1,
        tin: 1,
        payeeName: 1
      }
    }, 5000);
    this.now = new Date();
    this.rows = this.restaurants.map(rt => this.turnRtObjectIntoRow(rt));
  }

  turnRtObjectIntoRow(rt) {
    const rtTIN = rt.tin || null;
    const payeeName = rt.payeeName || null;
    const email = (rt.channels || []).filter(ch => ch.type === 'Email' && (ch.notifications || []).includes('Invoice')).map(ch => ch.value); // RT *must* have an invoice email channel
    const ga = rt.googleAddress;
    const streetAddress = `${ga.street_number} ${ga.route}`;
    const cityStateZip = `${ga.locality}, ${ga.administrative_area_level_1} ${ga.postal_code}`
    const timezone = ga.timezone || 'America/New_York';
    const menus = rt.menus;
    (menus || []).forEach(menu => {
      menu.hours = (menu.hours || []).map(hour => new Hour(hour));
    });
    const closedHours = rt.closedHours;
    const openOrNot = this.isRTOpened(menus, closedHours, timezone);

    return {
      id: rt._id,
      name: rt.name,
      email,
      streetAddress,
      cityStateZip,
      form1099k: rt.form1099k,
      payeeName,
      rtTIN,
      channels: rt.channels || [],
      timezone,
      openOrNot
    }
  }

  isRTOpened(menus, closedHours, timezone) {
    // judge whether open
    // 1. by menu hours
    let flag = false;
    for (let i = 0; i < (menus || []).length; i++) {
      const menu = (menus || [])[i];
      if ((menu.hours || []).some(hour => hour.isOpenAtTime(this.now, timezone))) {
        flag = true;
        break;
      }
    }
    // 2. by restaurant closed hours
    closedHours = (closedHours || []).filter(hour => !(hour.toTime && this.now > hour.toTime));

    if (closedHours.some(hour => {
      let nowTime = TimezoneHelper.getTimezoneDateFromBrowserDate(this.now, timezone);
      return nowTime >= hour.fromTime && nowTime <= hour.toTime;
    })) {
      flag = false;
    }
    return flag;
  }

  // filter the biz of restaurant's contacts to show on rt portal
  getBizContacts(channels) {
    return (channels || []).filter(channel => channel.type === 'Phone' && (channel.notifications || []).includes('Business')).map(c => c.value).join(', ');
  }

  allAttributesPresent(row) {
    const emailExists = (row.email || []).length > 0;
    const payeeNameExists = (row.payeeName || "").length > 0;
    const tinExists = (row.rtTIN || "").length > 0;
    return emailExists && payeeNameExists && tinExists;
  }

  filterRows() {
    /* pass through several layers of filtering based on each possible criteria: 
    taxYear, showingMissingPayee, showMissingTIN, and showMissingEmail */
    this.filteredRows = JSON.parse(JSON.stringify(this.rows));

    // taxYear
    if (this.taxYear !== 'All') {
      const year = parseInt(this.taxYear);
      this.filteredRows = this.filteredRows.filter(row => (row.form1099k || []).findIndex(form => form.year === year) >= 0);
      this.filteredRows.map(row => {
        row.form1099k = (row.form1099k || []).filter(form => form.year === year);
        return row;
      })
    }
    // rt open or not
    if (this.openOption === openRTOptionTypes.Open) {
      this.filteredRows = this.filteredRows.filter(row => row.openOrNot);
    } else if (this.openOption === openRTOptionTypes.Not_Open) {
      this.filteredRows = this.filteredRows.filter(row => !row.openOrNot);
    }
    // missing payee
    if (this.missPayeeOption === missPayeeOptionTypes.Missing_Payee) {
      this.filteredRows = this.filteredRows.filter(row => !row.payeeName);
    } else if (this.missPayeeOption === missPayeeOptionTypes.Has_Payee) {
      this.filteredRows = this.filteredRows.filter(row => row.payeeName);
    }
    // missing TIN (TIN is a company unique ID number)
    if (this.missTINOption === missTINOptionTypes.Missing_TIN) {
      this.filteredRows = this.filteredRows.filter(row => !row.rtTIN);
    } else if (this.missTINOption === missTINOptionTypes.Has_TIN) {
      this.filteredRows = this.filteredRows.filter(row => row.rtTIN);
    }
    // missing email
    if (this.missingEmailOption === missingEmailOptionTypes.Missing_Email) {
      this.filteredRows = this.filteredRows.filter(row => (row.email || []).length === 0);
    } else if (this.missingEmailOption === missingEmailOptionTypes.Has_Email) {
      this.filteredRows = this.filteredRows.filter(row => (row.email || []).length !== 0);
    }

    // search will match RT name, RT id, payee name, or email address
    if (this.searchFilter && this.searchFilter.trim().length > 0) {
      this.filteredRows = this.filteredRows.filter(row => {
        let lowerCaseSearchFilter = this.searchFilter.toLowerCase();
        const nameMatch = (row.name || "").toLowerCase().includes(lowerCaseSearchFilter);
        const idMatch = (row.id.toString() || "").toLowerCase().includes(lowerCaseSearchFilter);
        const payeeMatch = (row.payeeName || "").toLowerCase().includes(lowerCaseSearchFilter);
        const emailMatch = (row.email || []).some(entry => entry.toLowerCase().includes(lowerCaseSearchFilter));
        return nameMatch || idMatch || payeeMatch || emailMatch;
      });
    }
  }

  async submitTIN(event, rowIndex) {
    this.filteredRows[rowIndex].rtTIN = event.newValue;

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, tin: event.newValue }
      }
    ]).toPromise();
  }

  async submitPayee(event, rowIndex) {
    this.filteredRows[rowIndex].payeeName = event.newValue;

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, payeeName: event.newValue }
      }
    ]).toPromise();
  }

  async submitEmail(event, rowIndex) {
    /* we only allow user to submit email if one does not already exist. 
    to avoid possible confusion, will not allow users to edit existing channels from this component*/
    const newChannel = {
      type: 'Email',
      value: event.newValue,
      notifications: ['Invoice']
    }
    this.filteredRows[rowIndex].email = [newChannel.value];

    const oldChannels = this.filteredRows[rowIndex].channels;
    const newChannels = [...oldChannels, newChannel];

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.filteredRows[rowIndex].id },
        new: { _id: this.filteredRows[rowIndex].id, channels: newChannels }
      }
    ]).toPromise();

  }

  async renderPDFForm(row, form1099KData, target) {
    let formTemplateUrl;
    if (target === 'qmenu') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k_qmenu.pdf";
    } else if (target === 'restaurant') {
      formTemplateUrl = "../../../../assets/form1099k/form1099k.pdf";
    }
    const formBytes = await fetch(formTemplateUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm();

    const qMenuAddress = `
    qMenu, Inc.
    107 Technology Pkwy NW, Ste. 211
    Peachtree Corners, GA 30092`;

    // Calendar Year Blank (fill in last two digits of tax year)
    form.getTextField(`topmostSubform[0].CopyB[0].CopyBHeader[0].CalendarYear[0].f2_1[0]`).setText(form1099KData.year.toString().slice(-2));
    // Filer checkbox
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].FILERCheckbox_ReadOrder[0].c2_3[0]`).check();

    // Transaction reporting checkbox:
    form.getCheckBox(`topmostSubform[0].CopyB[0].LeftCol[0].c2_5[0]`).check();
    // Payee's name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_2[0]`).setText(qMenuAddress);
    // Payee's Name:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_3[0]`).setText(row.payeeName);
    // Street Address:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_4[0]`).setText(row.streetAddress);
    // City, State, and ZIP Code:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_5[0]`).setText(row.cityStateZip);
    // PSE's Name and Telephone Number:
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_6[0]`).setText('');
    // Account Number (leave blank)
    form.getTextField(`topmostSubform[0].CopyB[0].LeftCol[0].f2_7[0]`).setText('');

    // Filer's TIN
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_8[0]`).setText('81-4208444');
    // Payee's TIN    
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_9[0]`).setText(row.rtTIN)
    // Box 1b card not present transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box1b_ReadOrder[0].f2_11[0]`).setText(form1099KData.total.toFixed(2));
    // Box 2 - Merchant category code (Always 5812 for restaurants)
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_12[0]`).setText('5812');
    // Box 3 - Number of payment transactions
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_13[0]`).setText(form1099KData.transactions.toString());
    // Box 4 - Federal income tax withheld
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_14[0]`).setText('');
    // Box 5a - January income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5a_ReadOrder[0].f2_15[0]`).setText(form1099KData[0].toFixed(2));
    // Box 5b - February income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_16[0]`).setText(form1099KData[1].toFixed(2));
    // Box 5c - March income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5c_ReadOrder[0].f2_17[0]`).setText(form1099KData[2].toFixed(2))
    // Box 5d - April income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_18[0]`).setText(form1099KData[3].toFixed(2))
    // Box 5e - May income

    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5e_ReadOrder[0].f2_19[0]`).setText(form1099KData[4].toFixed(2));
    // Box 5f - June income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_20[0]`).setText(form1099KData[5].toFixed(2));
    // Box 5g - July income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5g_ReadOrder[0].f2_21[0]`).setText(form1099KData[6].toFixed(2));
    // Box 5h - August income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_22[0]`).setText(form1099KData[7].toFixed(2));
    // Box 5i - September income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5i_ReadOrder[0].f2_23[0]`).setText(form1099KData[8].toFixed(2));
    // Box 5j - October income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_24[0]`).setText(form1099KData[9].toFixed(2));
    // Box 5k - November income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box5k_ReadOrder[0].f2_25[0]`).setText(form1099KData[10].toFixed(2));
    // Box 5l - December income
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].f2_26[0]`).setText(form1099KData[11].toFixed(2));
    // Box 6 - State
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box6_ReadOrder[0].f2_27[0]`).setText('');
    // Box 7 - State ID
    form.getTextField(`topmostSubform[0].CopyB[0].RightCol[0].Box7_ReadOrder[0].f2_29[0]`).setText('');

    form.updateFieldAppearances();
    let pdfBytes;

    if (target === 'qmenu') {
      pdfBytes = await pdfDoc.save();
    } else if (target === 'restaurant') {
      const newDoc = await PDFDocument.create();
      const [copiedPage] = await newDoc.copyPages(pdfDoc, [3]);
      newDoc.addPage(copiedPage);
      pdfBytes = await newDoc.save();
    }

    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `f1099k_${form1099KData.year}_${row.name}_for${target === 'qmenu' ? '_qmenu' : '_restaurant'}.pdf`;
    link.click();
  }

  executeBulkFileOperation() {
    if (this.bulkFileOperation === 'qmenu') {
      this.bulkQMenuDownload(this.bulkOperationYear);
    } else if (this.bulkFileOperation === 'restaurant') {
      this.bulkSendFilesToRTs(this.bulkOperationYear);
    }
  }

  isMissingBulkFileAttributes() {
    return !this.bulkFileOperation || !this.bulkOperationYear;
  }

  async bulkQMenuDownload(year) {
    console.log(`bulk qmenu download ${year}`);

  }

  async bulkSendFilesToRTs(year) {

    // https://stackoverflow.com/questions/11098285/sending-email-with-attachment-using-amazon-ses
    // documentation regarding Amazon SES Raw Email (AWS email service that allows attachments)
  }
}

