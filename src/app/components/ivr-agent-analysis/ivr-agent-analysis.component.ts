import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-ivr-agent-analysis',
  templateUrl: './ivr-agent-analysis.component.html',
  styleUrls: ['./ivr-agent-analysis.component.css']
})
export class IvrAgentAnalysisComponent implements OnInit {

  agentData = null
  agents;

  constructor(private _api: ApiService) { }

  async ngOnInit() {
    let ivrData = await this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "amazon-connect-ctr",
        query: {
          "Channel": 'VOICE',
          Agent: { $ne: null },
          createdAt: { $gt: new Date().setHours(new Date().getHours() - 24) }
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
    console.log(ivrData)
  }

  getAgents(agentData) {
    this.agents = [...new Set(agentData.map(obj => obj.Agent.Username))]
    console.log("THESE ARE THE AGENTS ", this.agents)

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

    console.log(obj)

    agentData.map((data) => {
      obj[data.Agent.Username].callData.push({
        start: data.ConnectedToSystemTimestamp,
        end: data.DisconnectTimestamp,
        duration: data.Agent.AgentInteractionDuration,
        afterContactDuration: data.Agent.AfterContactWorkDuration
      })
    })

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
    console.log("RES ", obj)


  }

}
