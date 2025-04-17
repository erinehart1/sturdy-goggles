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
                this.pullRequests = data.map(pr => ({
                    ...pr,
                    fileLinks: pr.files.map(file => ({
                        name: file,
                        url: this.buildGitHubFileLink(file)
                    }))
                }));
            })
            .catch(error => {
                console.error('Error fetching PRs', error);
            });
        }
        buildGitHubFileLink(filePath) {
            const repoBase = 'https://github.com/my-org/sturdy-goggles/blob/main/';
            return `${repoBase}${filePath}`;
        }
}
