import { Component, OnInit, ViewChild, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';
import { Chart } from 'chart.js';
import { QueryReadType } from '@angular/core/src/render3/interfaces/query';



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
  totalTimes = []
  entriesLength
  agentMappedData = {};
  sortBy = 'Total Calls'
  sorting = 'Ascending'
  criteria = 'Last 24 hours'
  inputDateOne
  inputDateTwo
  validDate = true


  constructor(private _api: ApiService) { }

  changeDate() {
    console.log("DATE CHANGING 1 ", this.inputDateOne)
    console.log("DATE CHANGING 2 ", this.inputDateTwo)

    let dateOne = new Date(this.inputDateOne)
    let dateTwo = new Date(this.inputDateTwo)
    console.log("DATE 1", dateOne)
    console.log("DATE 2", dateTwo)


    if (dateOne && dateTwo && (dateOne > dateTwo)) {
      this.validDate = false
    }

  }

  setCriteria(type) {
    console.log("INPUT DATE 1 ", this.inputDateOne)
    console.log("INPUT DATE 2 ", this.inputDateTwo)

    switch (type) {
      case 'customDate':
        this.criteria = 'Custom Date'
        break
      case '24Hours':
        this.criteria = 'Last 24 hours'
        break
      case '48Hours':
        this.criteria = 'Last 48 hours'
        break
      case '3Days':
        this.criteria = 'Last 3 days'
        break
      case '7Days':
        this.criteria = 'Last 7 days'
        break
      case '30Days':
        this.criteria = 'Last 30 days'
        break
      default:
        console.log("NO CRITERIA SPECIFIED")
        break
    }

  }
  ngAfterViewInit() {
    // print array of CustomComponent objects
    this.components.changes.subscribe(
      () => {
        let arr = (this.components.toArray())

        arr.forEach(el => {
          let agent = el.nativeElement.innerHTML
          let data = this.processChartData(agent)
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
              labels: this.totalTimes,
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

      }
    );
  }
  reload() {
    // this.ngOnInit()
  }

  populateTimePeriods(criteria) {
    let timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
    // AM 

    for (let i = 0; i < timePeriods.length; i++) {
      for (let x = 0; x < 60; x++) {
        let time: any = (timePeriods[i] + x)
        time = time.toString()
        let period = timePeriods[i]
        if (period.toString().length === 3) {
          time = `${time[0]}:${time[1]}${time[2]}AM`
        } else {
          time = `${time[0]}${time[1]}:${time[2]}${time[3]}AM`
        }
        this.totalTimes.push(time)
      }
    }
    for (let i = 0; i < timePeriods.length; i++) {
      for (let x = 0; x < 60; x++) {
        let time: any = (timePeriods[i] + x)
        time = time.toString()
        let period = timePeriods[i]
        if (period.toString().length === 3) {
          time = `${time[0]}:${time[1]}${time[2]}PM`
        } else {
          time = `${time[0]}${time[1]}:${time[2]}${time[3]}PM`
        }
        this.totalTimes.push(time)
      }
    }

    switch (criteria) {

      case 'Last 24 hours':
        let currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 216)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 192)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 48 hours':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 48)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 0)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 3 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 72)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 0)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 7 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 168)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 0)
        console.log("CURRENT END OF THE DAY ", new Date(this.currentEndDay))
        break
      case 'Last 30 days':
        currentStartDay = new Date();
        currentStartDay.setHours(0, 0, 0, 0);
        this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 720)
        console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))
        this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 0)
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



  }

  async queryData() {
    this.populateTimePeriods(this.criteria)
    let ivrData = await this._api
      .get(environment.qmenuApiUrl + "generic", {
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
        limit: 10000,
      })
      .toPromise();
    this.rawIvrData = ivrData
    this.agents = this.processAgents(this.rawIvrData)
  }

  async ngOnInit() {


    await this.queryData()
  }

  processChartData(agentName) {
    let data = []
    for (let i = 0; i < 1440; i++) {
      data.push(Number.NaN)
    }

    // 

    // let example = this.agents.filter(agent => agent.)

    let example = this.agents[agentName].callData

    example.forEach((callData) => {
      if (callData && callData.start && callData.end) {
        let unitOfTime = Math.floor(((new Date(callData.start).getTime() - this.currentStartDay) / 86400000) * 1440)
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


    this.agentMappedData = agent_mapped_data
    return agent_mapped_data

  }

  sort() {
    // agentMappedData is the final data structure
    let agentArrayData = []
    for (const agentName in this.agentMappedData) {
      agentArrayData.push({
        agent: agentName,
        totalCallTime: this.agentMappedData[agentName]['totalCallTime'],
        avgCallTime: this.agentMappedData[agentName]['avgCallTime'],
        totalCalls: this.agentMappedData[agentName]['totalCalls']
      })
    }
    this.entriesLength = agentArrayData.length

    switch (this.sortBy) {
      case 'Total Calls':
        this.sorting === 'Ascending' ? null : null
        break
      case 'Avg Calls':
        this.sorting === 'Ascending' ? null : null
        break
      case 'Call Time':
        this.sorting === 'Ascending' ? null : null
        break
      case 'Agent Name':
        this.sorting === 'Ascending' ? null : null
      default:
    }
    let arr4 = [...agentArrayData]
    arr4.sort((a, b) => b.totalCalls - a.totalCalls)
    let arr2 = [...agentArrayData]
    agentArrayData.sort((a, b) => {
      return b.totalCallTime - a.totalCallTime
    })

    arr2.sort((a, b) => {
      return b.avgCallTime - a.avgCallTime
    })

  }

  getData(agentName) {
    return this.agentMappedData[agentName]
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