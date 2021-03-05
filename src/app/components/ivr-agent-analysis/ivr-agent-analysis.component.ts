import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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


  title = 'Charts.js in Angular 9';

  lineChart: any;
  lineChart2: any

  agentData = null
  segmentedData = null
  agents;

  constructor(private _api: ApiService) { }

  reload() {

  }





  lineChartMethod() {
    let example = this.segmentedData['alice.xie'].callData

    console.log("EXAMPLE ", example)
    let timePeriods = [1200, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
    // AM 
    let totalTimes = []
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
        totalTimes.push(time)
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
        totalTimes.push(time)
      }
    }
    console.log(totalTimes)

    let agentActivity = []

    for (let i = 0; i < 720; i++) {
      if (Math.random() <= .05) {
        agentActivity.push(1)
        agentActivity.push(1)

      }
      else {
        agentActivity.push(Number.NaN)
        agentActivity.push(Number.NaN)

      }
    }

    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
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
        labels: totalTimes,
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
            data: agentActivity,
            spanGaps: false,
          }
        ]
      }
    });
    this.lineChart2 = new Chart(this.lineCanvas2.nativeElement, {
      options: {
        scales: {
          yAxes: [{
            ticks: {
              max: 1,
              min: 0,
              stepSize: 1
            }
          }]
        }
      },
      type: 'line',
      data: {
        labels: totalTimes,
        datasets: [
          {
            label: 'Activity Over 24 Hours',
            fill: true,
            lineTension: 0.1,
            backgroundColor: 'rgba(75,192,192,0.4)',
            borderColor: 'rgba(75,192,192,1)',
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: 'rgba(75,192,192,1)',
            pointBackgroundColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgba(75,192,192,1)',
            pointHoverBorderColor: 'rgba(220,220,220,1)',
            pointHoverBorderWidth: 2,
            pointRadius: 1,
            stepSize: 1,
            pointHitRadius: 10,
            data: agentActivity,
            spanGaps: false,
          }
        ]
      }
    });
  }

  async ngOnInit() {

    let ivrData = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "amazon-connect-ctr",
        query: {
          "Channel": 'VOICE',
          Agent: { $ne: null },
          createdAt: {
            $gt: new Date().setHours(new Date().getHours() - 108),
            $lt: new Date().setHours(new Date().getHours() - 72)
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
    this.getAgents(this.agentData)
    this.lineChartMethod();

    // console.log(ivrData)
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
    // console.log("AVG CALL SORT", arr2)

    // console.log("ALL DATA ", obj)
  }

}
