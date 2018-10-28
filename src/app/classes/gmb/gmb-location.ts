/**
 * GMB Location is returned from scanning of google my business managed locations
 */
export class GmbLocation {
    address: string;
    appealId: string;
    cid: string;
    homepage: string;
    name: string;
    place_id: string;
    status: 'Published' | 'Duplicate' | 'Pending verification' | 'Verification required' | 'Suspended';
    constructor(location?: any) {
        if (location) {
            // copy every fields
            for (const k in location) {
                if (location.hasOwnProperty(k)) {
                    this[k] = location[k];
                }
            }

        }
    }

}
