import { environment } from "src/environments/environment";
import { ApiService } from "../services/api.service";
import { LeadFilter } from "./lead-filter";
import { LeadFunnelAnalysis } from "./lead-funnel-analysis";
export class LeadFunnel {
    _id?: string;
    createdAt?: Date;
    createdBy?: string;
    name: string;
    description?: string;
    filters: LeadFilter[];
    analysis?: LeadFunnelAnalysis[];
    published?: boolean;

    constructor(funnel?: any) {
        if (funnel) {
            // copy every fields
            for (const k in funnel) {
                if (funnel.hasOwnProperty(k)) {
                    this[k] = funnel[k];
                }
            }
        }
    }

    getComments() {
        return this.filters.map(f => f.comment).filter(c => c).join(", ");
    }

    getAnalysisString() {
        return (this.analysis || []).map(a => a.count).join(' → ');
    }

    // some OOP style functions, having side effects (store fresh analysis to DB)
    async analyze(_api: ApiService) {
        // reset
        this.analysis = [];
        // always load number of ALL leads first
        const [all] = await _api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'raw-lead',
            aggregate: [
                { $match: { _id: { $exists: true } } },
                {
                    $count: "count"
                }
            ]
        }).toPromise();
        this.analysis.push(all)
        for (let i = 0; i < this.filters.length; i++) {
            const filter: LeadFilter = this.filters[i];
            const $match = {};
            // apply all filters upto index i
            for (let j = 0; j <= i; j++) {
                const f: LeadFilter = this.filters[j];
                $match[f.field] = {
                    [f.operator]: f.value
                }
            }
            const result = await _api.get(environment.qmenuApiUrl + 'generic', {
                resource: 'raw-lead',
                aggregate: [
                    { $match },
                    {
                        $count: "count"
                    }
                ]
            }).toPromise();
            const count = result[0].count;
            const ratio = count / (this.analysis[this.analysis.length - 1].count || 1);
            this.analysis.push({ count, ratio, filter });
        }

        // always save last analysis
        await _api.patch(environment.qmenuApiUrl + 'generic?resource=lead-funnel', [
            {
                old: { _id: this._id },
                new: { _id: this._id, analysis: this.analysis }
            }
        ]).toPromise();

        // samples!
        const $match = { _id: { $exists: true } };
        this.filters.reduce((m, filter) => (m[filter.field] = {
            [filter.operator]: filter.value
        }, m), $match);

        const sampleRows = await _api.get(environment.qmenuApiUrl + 'generic', {
            resource: 'raw-lead',
            aggregate: [
                { $match },
                {
                    $project: {
                        hours: 0, // exclude hours and everything else are returned
                    }
                },
                { $limit: 100 }
            ]
        }).toPromise();
        return sampleRows;
    }
}