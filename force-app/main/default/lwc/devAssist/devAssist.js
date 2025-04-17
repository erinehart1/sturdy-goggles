import { LightningElement } from 'lwc';
import getMergedPRs from '@salesforce/apex/GitHubService.getMergedPRs';

export default class DevAssist extends LightningElement {
    pullRequests;

    connectedCallback() {
        console.log('DevAssist connectedCallback triggered');
        // Update this path based on the metadata you're displaying contextually
        const metadataPath = 'force-app/main/default/objects/Contact/fields/My_Second_Field__c.field-meta.xml';

        getMergedPRs({ path: metadataPath })
            .then(data => {
                console.log('Received PR data:', JSON.stringify(data));
                this.pullRequests = data;
            })
            .catch(error => {
                console.error('Error fetching PRs', error);
            });
        }
}
