import { Component, OnInit, ViewChild, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { Chart } from 'chart.js';



@Component({
  selector: 'app-ivr-agent-analysis',
  templateUrl: './ivr-agent-analysis.component.html',
  styleUrls: ['./ivr-agent-analysis.component.css']
})
export class IvrAgentAnalysisComponent implements OnInit {

  @ViewChild('lineCanvas') lineCanvas;
  @ViewChild('lineCanvas2') lineCanvas2;
  @ViewChildren('cmp') components: QueryList<ElementRef>;


  currentStartDay;
  currentEndDay;
  rawIvrData = null
  agents;
  totalLineTimes = []
  entriesLength
  agentMappedData = [];
  objAgentMappedData = {}
  sortBy = 'Total Call Time'
  sorting = 'Descending'
  criteria = 'Last 24 hours'
  inputDateOne
  inputDateTwo
  validDate = true
  showHistogram = false
  showLine = true
  agentMappingNames = {
    alanxue: 'Xue, Alan',
    "alice.xie": "Xie, Alice",
    "amy.yang": "Yang, Amy",
    "annie.cheng": "Cheng, Annie",
    "anny.fang": "Fang, Anny",
    "bikram.rai.csr": "Rai, Bikram",
    "bikram.rai.gmb": "Rai, Bikram",
    "carrie.li": "Li, Carrie",
    "cathy.fu": "fu, cathy",
    "chris.xu": "Xu, Chris",
    "cici.yang": "Yang, Cici",
    "decenith": "qmenu, decenith",
    "demi.he": "He, Demi",
    "dixon.adair": "Adair, Dixon",
    "dyney.yang": "Yang, Dyney",
    "emily.hu": "Hu, Emily",
    "felix.ou": "Ou, Felix",
    "garysui": "Sui, Gary",
    "gmb.test": "test, gmb",
    "hayley.xiong": "Xiong, Hayley",
    "iggy.susara": "Susara, Iggy",
    "ivy.li": "Li, Ivy",
    "jay": "esplana, jay",
    "jennica.cuevas": "Cuevas, Jennica",
    "jhon.medick": "medick, jhon",
    "jhunno.flores": "Flores, Jhunno",
    "joanan.yuan": "Yuan, Joanan",
    "judy.song": "Song, Judy",
    "julia.xiong": "Xiong, Julia",
    "june.borah.csr": "Borah, June",
    "june.borah.gmb": "Borah, June",
    "kk.chen": "Chen, KK",
    "lina.yang": "yang, lina",
    "lucy.yuan": "Yuan, Lucy",
    "mary.zhang": "Zhang, Mary",
    "max.yi": "yi, max",
    "may.lin": "Lin, May",
    "merry.empic": "Empic, Merry",
    "mia.yang": "Yang, Mia",
    "nicole.hu": "Hu, Nicole",
    "outbound": "Only, Outbound",
    "piapi": "qmenu, piapi",
    "sacha.luo": "Luo, Sacha",
    "sajal.khati": "Khati, Sajal",
    "sandy.he": "He, Sandy",
    "sean": "Lyu, Sean",
    "sherry.zhao": "Zhao, Sherry",
    "sunny.fu": "fu, sunny",
    "vivi.hu": "Hu, Vivi",
    "yinghong.mo": "Mo, Yinghong"

  }

  graphViewing = 'Total Calls'


  getAgent(key) {
    if (key in this.agentMappingNames) {
      return this.agentMappingNames[key]
    } else {
      return key
    }
  }

  setGraphView(type) {
    this.graphViewing = type
    this.queryData(this.criteria)
  }

  constructor(private _api: ApiService) { }

  changeDate() {
    // console.log("DATE CHANGING 1 ", this.inputDateOne)
    // console.log("DATE CHANGING 2 ", this.inputDateTwo)

    let dateOne = new Date(this.inputDateOne)
    let dateTwo = new Date(this.inputDateTwo)
    // console.log("DATE 1", dateOne)
    // console.log("DATE 2", dateTwo)


    if (dateOne && dateTwo && (dateOne > dateTwo)) {
      this.validDate = false
    }

    if (dateOne && dateTwo && (dateOne <= dateTwo)) {
      this.validDate = true
    }

    if (dateOne && dateTwo) {
      // console.log("QUERYING FOR THE DATA DATE 1 ", this.inputDateOne)
      // console.log("QUERYING FOR THE DATA DATE 2", this.inputDateTwo)
      this.queryData(this.criteria)
    }

  }

  setSortBy(type) {
    this.sortBy = type
    this.sort(this.agentMappedData, this.sortBy, this.sorting)
  }

  setCriteria(type) {
    // console.log("THIS IS THE TYPE ", type)
    // console.log("INPUT DATE 1 ", this.inputDateOne)
    // console.log("INPUT DATE 2 ", this.inputDateTwo)

    switch (type) {
      case 'customDate':
        if (this.inputDateOne && this.inputDateTwo) {
          this.queryData(this.criteria)
        }
        console.log("BOTH DATES NOT ENTERED")
        this.criteria = 'Custom Date'
        this.queryData(this.criteria)
        break
      case '24Hours':
        this.criteria = 'Last 24 hours'
        this.queryData(this.criteria)
        break
      case '48Hours':
        this.criteria = 'Last 48 hours'
        this.queryData(this.criteria)
        break
      case '3Days':
        this.criteria = 'Last 3 days'
        this.queryData(this.criteria)
        break
      case '7Days':
        this.criteria = 'Last 7 days'
        this.queryData(this.criteria)
        break
      case '30Days':
        this.criteria = 'Last 30 days'
        this.queryData(this.criteria)
        break
      default:
        console.log("NO CRITERIA SPECIFIED")
        break
    }

  }

  processBarData(agentName) {

    let dates = { dates: [], totalCalls: [], avgCallTime: [], totalCallTime: [] }

    for (let x = this.currentStartDay; x <= this.currentEndDay; x += 86200000) {
      // for each d
      let callData = this.agents[agentName].callData
      let inTimeFrame = 0
      let counter = 0
      let totalCallTime = 0
      callData.forEach(call => {
        if (Math.abs(new Date(call.start).getTime() - x) <= 55000000) {
          totalCallTime += (new Date(call.end).getTime() - new Date(call.start).getTime()) / 1000 / 60
          inTimeFrame += 1
          counter += 1.5
        }
      })

      dates['dates'].push(new Date(x).toDateString())
      dates['totalCalls'].push(inTimeFrame)
      totalCallTime ? dates['avgCallTime'].push(totalCallTime / counter) : dates['avgCallTime'].push(0)
      totalCallTime ? dates['totalCallTime'].push(totalCallTime) : dates['totalCallTime'].push(0)
    }
    return dates
  }

  ngAfterViewInit() {
    // print array of CustomComponent objects
    this.components.changes.subscribe(
      () => {

        if (this.showLine) {
          console.log("IN SUBSCRIPTION SHOW LINE IS TRUE")
        }

        if (this.showHistogram) {
          console.log("IN SUBSCRIPTION SHOW HISTOGRAM")
        }

        if (!this.showLine && !this.showHistogram) {
          console.log("IN SUBSCRIPTION AND NOTHING IS TO BE RENDERED")
        }


        let arr = (this.components.toArray())
        // If less than 7 days render line graph, elsewise render histogram 
        if (this.showHistogram) {
          arr.forEach(el => {
            let agent = el.nativeElement.innerHTML
            let dates = this.processBarData(agent)
            console.log("DATA ", dates)
            let data;
            let label
            switch (this.graphViewing) {
              case 'Total Calls':
                data = dates['totalCalls']
                label = '# of Calls per Day'
                break
              case "Avg Call Time":
                data = dates['avgCallTime']
                label = 'Avg Call Time Per Day in Minutes'
                break
              case 'Total Call Time':
                data = dates['totalCallTime']
                label = 'Total Call Time Per Day in Minutes'
                break
              default:
                console.log("NO VIEWING SELECTED! ")
                break
            }
            new Chart(el.nativeElement, {
              type: 'bar',
              data: {
                labels: dates['dates'],
                datasets: [{
                  label,
                  data,
                  borderWidth: 1
                }]
              },
              options: {
                scales: {
                  yAxes: [{
                    ticks: {
                      beginAtZero: true
                    }
                  }]
                }
              }
            })
          })
        } else if (this.showLine) {
          arr.forEach(el => {
            let agent = el.nativeElement.innerHTML
            console.log("THIS IS AGENT IN PROCESSING ", agent)
            let data = this.processLineChartData(agent)
            new Chart(el.nativeElement, {
              options: {
                scales: {
                  yAxes: [{
                    ticks: {
                      max: 1,
                      min: 0,
                      spanGaps: true,
                      stepSize: 1
                    }
                  }]
                }
              },
              showTooltips: true,

              type: 'line',
              data: {
                labels: this.totalLineTimes,
                datasets: [
                  {
                    label: 'Activity Over 24 Hours',
                    fill: true,
                    lineTension: 0.1,
                    backgroundColor: 'rgba(252, 3, 3,1.0)',
                    borderCapStyle: 'butt',
                    borderDash: [],
                    borderDashOffset: 0.0,
                    borderJoinStyle: 'miter',
                    pointRadius: 1,
                    stepSize: 1,
                    pointHitRadius: 10,
                    data: data,
                    spanGaps: false,
                  }
                ]
              }
            });
          })
        } else {
          console.log("NEITHER HISTORY NOR LINE IS SET TO RENDER")
        }

      }
    );
  }
  reload() {
    this.queryData(this.criteria)
  }

  populateLineTimePeriods(criteria) {
    this.totalLineTimes = []
    if (criteria == 'Custom Date' && (!this.inputDateOne || !this.inputDateTwo)) {
      // console.log("THIS WAS CALLED BUT TWO DATES ARE NOT ENTERED YET ")
      // console.log("DATE 1 POPULATE TIME PERIODS ", this.inputDateOne)
      // console.log("DATE 2 POPULATE TIME PERIODS ", this.inputDateTwo)
    }



    let timePeriods: number[]
    // AM 

    let timePeriodsLength: number
    let increments: number

    switch (criteria) {
      case 'Last 24 hours':
        timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
        timePeriodsLength = 12
        increments = 1
        break
      case 'Last 48 hours':
        timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
        timePeriodsLength = 24
        increments = 2
        break
      case 'Last 3 days':
        timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
        timePeriodsLength = 36
        increments = 3
        break
      case 'Custom Date':
        let dif = this.currentEndDay - this.currentStartDay

        if (dif >= 0 && dif <= 86200000) {
          timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
          timePeriodsLength = 12
          increments = 1
        } else if (dif >= 86200000 && dif <= 172400000) {
          timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
          timePeriodsLength = 24
          increments = 2
        } else if (dif <= 258600000) {
          timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
          timePeriodsLength = 36
          increments = 3
        } else {
          console.log("WE SHOULD NOT HAVE GOTTEN HERE")
          timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
          timePeriodsLength = 36
          increments = 3
        }
        break
      default:
        timePeriodsLength = 12
        increments = 1
        break

    }


    for (let i = 0; i < timePeriodsLength; i++) {
      for (let x = 0; x < 60; x += increments) {
        let time: any = (timePeriods[i] + x)
        time = time.toString()
        let period = timePeriods[i]
        if (period.toString().length === 3) {
          time = `${time[0]}:${time[1]}${time[2]}`
        } else {
          time = `${time[0]}${time[1]}:${time[2]}${time[3]}`
        }
        this.totalLineTimes.push(time)
      }
    }
    for (let i = 0; i < timePeriodsLength; i++) {
      for (let x = 0; x < 60; x += increments) {
        let time: any = (timePeriods[i] + x)
        time = time.toString()
        let period = timePeriods[i]
        if (period.toString().length === 3) {
          time = `${time[0]}:${time[1]}${time[2]}`
        } else {
          time = `${time[0]}${time[1]}:${time[2]}${time[3]}`
        }
        this.totalLineTimes.push(time)
      }
    }




  }

  populateBarTimePeriods() {

    let days = Math.ceil((this.currentStartDay - this.currentEndDay) / 86200000)

    console.log('IN POPULATE BAR TIME PERIODS WITH THESE NUMBER OF DAYS ', days)

  }

  async queryData(criteria) {


    switch (criteria) {
      case 'Custom Date':
        let currentStartDay = new Date(this.inputDateOne);
        currentStartDay.setHours(0, 0, 0, 0);
        let currentEndDay = new Date(this.inputDateTwo)
        this.currentStartDay = currentStartDay.getTime()
        console.log("CURRENT START OF THE DAY CUSTOM QUERY", new Date(this.currentStartDay))
        this.currentEndDay = currentEndDay.getTime()
        console.log("CURRENT END OF THE DAY CUSTOM QUERY", new Date(this.currentEndDay))
        break
      case 'Last 24 hours':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 48)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 48 hours':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 72)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 3 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 96)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 7 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 192)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 30 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 744)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      default:
        console.log("NO CURRENT DATE DETECTED")
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 192)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 168)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break

    }


    console.log("QUERY DATA WITH THIS DAY DIFFERENCE ", Math.ceil((this.currentEndDay - this.currentStartDay) / 87200000))
    if (Math.abs(this.currentEndDay - this.currentStartDay) <= 260000000) {
      console.log("PROCESSING LINE CHART DATA, LESS THAN EQUAL TO 3 DAYS")
      console.log("LINE CHART THE MILLISECOND DIFFERENCE IS ", Math.abs(this.currentStartDay - this.currentEndDay))
      this.showLine = true
      this.showHistogram = false
      this.populateLineTimePeriods(criteria)
    } else if (Math.abs(this.currentEndDay - this.currentStartDay) >= 260000000) {
      console.log("PROCESSING BAR CHART DATA, GREATER THAN EQUAL TO 3 DAYS")
      console.log("BAR CHART MILLISECOND DIFFERENCE ", Math.abs(this.currentStartDay - this.currentEndDay))
      this.showLine = false
      this.showHistogram = true
      this.populateBarTimePeriods()
    } else {
      this.showLine = false
      this.showHistogram = false
      console.log("SOME DATE IS UNDEFINED!!!!")
      console.log("INPUT START DATE 1 ", new Date(this.currentStartDay))
      console.log("INPUT END DATE ", new Date(this.currentEndDay))
    }





    // this.populateLineTimePeriods(criteria)
    let ivrData = await this._api
      .getBatch(environment.qmenuApiUrl + "generic", {
        resource: "amazon-connect-ctr",
        query: {
          "Channel": 'VOICE',
          Agent: { $ne: null },
          createdAt: {
            $gt: this.currentStartDay,
            $lt: this.currentEndDay
          }
        },
        projection: {
          'Agent.Username': 1,
          'ConnectedToSystemTimestamp': 1,
          'DisconnectTimestamp': 1,
          'Agent.AgentInteractionDuration': 1,
          'Agent.AfterContactWorkDuration': 1
        },
        limit: 50000,
      }, 10000)
    console.log("THE IVR DATA ", ivrData)
    this.rawIvrData = ivrData
    this.agents = this.processAgents(this.rawIvrData)
  }

  async ngOnInit() {
    await this.queryData(this.criteria)
  }

  processLineChartData(agentName) {
    let data = []
    for (let i = 0; i < 1440; i++) {
      data.push(Number.NaN)
    }

    // 

    // let example = this.agents.filter(agent => agent.)
    // console.log("THIS IS THE AGENT NAME ", agentName)
    // console.log("THIS IS THR AGENTS ", this.agents)
    let example = this.agents[agentName].callData
    // console.log("THIS IS THE EXAMPLE ", example)

    let dayDistribution: number;
    switch (this.criteria) {
      case 'Last 24 hours':
        dayDistribution = 86400000
        break
      case 'Last 48 hours':
        dayDistribution = 172800000
        break
      case 'Last 3 days':
        dayDistribution = 259200000
        break
      case 'Custom Date':
        let time = this.currentStartDay - this.currentEndDay
        if (time >= 0 && time <= 87200000) {
          dayDistribution = 86400000
        } else if (time >= 86400000 && time <= 173000000) {
          dayDistribution = 172800000
        } else {
          dayDistribution = 259200000
        }
        break
      default:
        console.log("NO VALID DAY DISTRUBTION, criteria NOT FOUND")
        break
    }

    example.forEach((callData) => {
      if (callData && callData.start && callData.end) {
        let unitOfTime = Math.floor(((new Date(callData.start).getTime() - this.currentStartDay) / dayDistribution) * 1440)
        let lengthOfCall = (new Date(callData.end).getTime() - new Date(callData.start).getTime()) / 1000
        let counter = unitOfTime
        for (let i = 0; i <= lengthOfCall; i += 60) {
          data[counter] = 1
          counter += 1
        }
        data[counter] = 1
      }
    })
    return data
  }

  processAgents(rawIvrData) {


    // Object representation
    console.log("IN PROCESS AGENTS")
    this.agents = [...new Set(rawIvrData.map(obj => obj.Agent.Username))]
    // console.log("THESE ARE THE AGENTS ", this.agents)
    let agent_mapped_data = {}
    this.agents.forEach(agent => {
      agent_mapped_data[agent] = {
        totalCalls: 0,
        callData: [],
        totalCallTime: 0,
      }
    })

    rawIvrData.map((data) => {
      agent_mapped_data[data.Agent.Username].callData.push({
        start: data.ConnectedToSystemTimestamp,
        end: data.DisconnectTimestamp,
        duration: data.Agent.AgentInteractionDuration,
      })
    })


    // total calls + avg call time + total_calltime
    for (const agentName in agent_mapped_data) {
      agent_mapped_data[agentName]['totalCalls'] = agent_mapped_data[agentName]['callData'].length
      let sum = 0
      agent_mapped_data[agentName]['callData'].forEach(obj => {
        sum += obj.duration
      })
      agent_mapped_data[agentName]['totalCallTime'] = sum;
      agent_mapped_data[agentName]['avgCallTime'] = sum / agent_mapped_data[agentName]['totalCalls'];
    }

    // let sortedData = this.sort(agent_mapped_data, this.sortBy, this.sorting)

    let arr_agent_mapped_data = []
    for (const agentName in agent_mapped_data) {

      arr_agent_mapped_data.push({
        agentName: agentName,
        totalCalls: agent_mapped_data[agentName]['totalCalls'],
        totalCallTime: agent_mapped_data[agentName]['totalCallTime'],
        avgCallTime: agent_mapped_data[agentName]['avgCallTime']
      })
    }
    // TODO: Work with arrays, not objects
    console.log("WE MADE IT THIS FAR ")
    this.objAgentMappedData = agent_mapped_data
    this.agentMappedData = this.sort(arr_agent_mapped_data, this.sortBy, this.sorting)
    this.entriesLength = Object.keys(agent_mapped_data).length
    return agent_mapped_data

  }

  setSorting(type) {
    this.sorting = type
    this.sort(this.agentMappedData, this.sortBy, this.sorting)
  }

  sort(agentArrayData, sortBy, sortType) {
    // agentMappedData is the final data structure


    switch (sortBy) {
      case 'Total Call Time':
        sortType !== 'Ascending' ? agentArrayData.sort((a, b) => b.totalCallTime - a.totalCallTime) : agentArrayData.sort((a, b) => a.totalCallTime - b.totalCallTime)
        break
      case 'Total Calls':
        sortType !== 'Ascending' ? agentArrayData.sort((a, b) => b.totalCalls - a.totalCalls) : agentArrayData.sort((a, b) => a.totalCalls - b.totalCalls)
        break
      case 'Avg Call Time':
        sortType !== 'Ascending' ? agentArrayData.sort((a, b) => b.avgCallTime - a.avgCallTime) : agentArrayData.sort((a, b) => a.avgCallTime - b.avgCallTime)
        break
      // case 'Meaningful Calls':
      //   sortType !== 'Ascending' ? agentArrayData.sort((a, b) => b.avgCallTime - a.avgCallTime) : agentArrayData.sort((a, b) => a.avgCallTime - b.avgCallTime)
      //   break
      case 'Sales Produced':
        console.log("NOT YET IMPLEMENTED YET")
        sortType !== 'Ascending' ? null : null
      default:
    }

    return agentArrayData

  }

  getData(agentName) {
    return this.objAgentMappedData[agentName]
  }

  log(val) {
    console.log(val)
  }
  secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return hDisplay + mDisplay + sDisplay;
  }

}


 // Start at 12:00AM of the day of the current Day
  // End At 11:59PM and at the end of the current Day
  // Segment the time between into 1440 evenly spaced out points
  // Find where the current call fits into that 1440 space distribution, and loop through and fill in those values as 1, at the rest as Number.NaN