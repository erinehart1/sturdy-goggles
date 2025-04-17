import { LightningElement, track } from 'lwc';
import getMergedPRs from '@salesforce/apex/GitHubService.getMergedPRs';

export default class DevAssist extends LightningElement {
    @track pullRequests;

    connectedCallback() {
        // Update this path based on the metadata you're displaying contextually
        const metadataPath = 'force-app/main/default/objects/Contact/fields/ImAContactField.field-meta.xml';

        getMergedPRs(metadataPath)
            .then(data => {
                this.pullRequests = data;
            })
            .catch(error => {
                console.error('Error fetching PRs', error);
            });
        }
}
