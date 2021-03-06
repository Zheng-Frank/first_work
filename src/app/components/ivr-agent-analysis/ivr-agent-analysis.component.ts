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
  agentData = null
  segmentedData = null
  agents;
  datum;
  totalTimes = []
  entries

  objData = {};


  constructor(private _api: ApiService) { }
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
    this.ngOnInit()
  }

  async ngOnInit() {
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
    let currentStartDay = new Date();
    currentStartDay.setHours(0, 0, 0, 0);
    this.currentStartDay = new Date().setHours(currentStartDay.getHours() - 48)

    console.log("CURRENT START OF THE DAY ", new Date(this.currentStartDay))

    this.currentEndDay = new Date().setHours(currentStartDay.getHours() - 24)


    console.log("CURRENT START OF THE DAY ", new Date(this.currentEndDay))



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
    this.agentData = ivrData
    this.agents = this.getAgents(this.agentData)
  }

  processChartData(agentName) {
    let data = []
    for (let i = 0; i < 1440; i++) {
      data.push(Number.NaN)
    }
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

  getAgents(agentData) {
    this.agents = [...new Set(agentData.map(obj => obj.Agent.Username))]
    // console.log("THESE ARE THE AGENTS ", this.agents)

    let obj = {}

    this.agents.forEach(agent => {
      obj[agent] = {
        totalCalls: 0,
        callData: [],
        totalCallTime: 0,
        idleTime: 0,
        avgIdleTime: 0,
        avgCallTime: 0

      }
    })

    // console.log(obj)

    agentData.map((data) => {
      obj[data.Agent.Username].callData.push({
        start: data.ConnectedToSystemTimestamp,
        end: data.DisconnectTimestamp,
        duration: data.Agent.AgentInteractionDuration,
        afterContactDuration: data.Agent.AfterContactWorkDuration
      })
    })

    this.segmentedData = obj

    // total calls
    for (const x in obj) {
      obj[x]['totalCalls'] = obj[x]['callData'].length
    }

    // totalCallTime + AVG CAll time + afterContact

    for (const x in obj) {
      let sum = 0
      let sum2 = 0
      obj[x]['callData'].forEach(obj => {
        sum += obj.duration
        sum2 += obj.afterContactDuration
      })
      obj[x]['totalCallTime'] = sum;
      obj[x]['totalAfterContactDuration'] = sum2
      obj[x]['avgCallTime'] = sum / obj[x]['totalCalls'];
      obj[x]['avgAfterContactDuration'] = sum2 / obj[x]['totalCalls'];
    }
    let arr = []
    for (const x in obj) {
      arr.push({
        agent: x,
        totalCallTime: obj[x]['totalCallTime'],
        avgCallTime: obj[x]['avgCallTime'],
        totalCalls: obj[x]['totalCalls']
      })
    }
    this.entries = arr.length

    let arr4 = [...arr]
    arr4.sort((a, b) => b.totalCalls - a.totalCalls)
    // console.log("TOTAL CALLS SORT ", arr4)
    let arr2 = [...arr]
    arr.sort((a, b) => {
      return b.totalCallTime - a.totalCallTime
    })
    // console.log("TOTAL CALL TIME SORT", arr)

    arr2.sort((a, b) => {
      return b.avgCallTime - a.avgCallTime
    })
    this.objData = obj
    // console.log("OBJ DATA DONE ", this.objData)
    return obj
    // console.log("AVG CALL SORT", arr2)

    // console.log("ALL DATA ", obj)
  }

  getData(agentName) {
    // console.log(this.objData)
    return this.objData[agentName]
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