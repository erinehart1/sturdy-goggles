import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getMergedPRs from '@salesforce/apex/GitHubService.getMergedPRs';

export default class DevAssist extends LightningElement {
    @track pullRequests;
    @track fileLinkMap = {};
    @track inferredPath;

    @wire(CurrentPageReference)
    getPageReference(pageRef) {
        if (pageRef && pageRef.attributes && pageRef.attributes.objectApiName) {
            const objectName = pageRef.attributes.objectApiName;
            // Use a placeholder naming pattern for now
            this.inferredPath = `force-app/main/default/objects/${objectName}/fields/My_Second_Field__c.field-meta.xml`;
            this.loadPullRequests();
        }
    }

    loadPullRequests() {
        if (!this.inferredPath) return;

        getMergedPRs(this.inferredPath)
            .then(data => {
                this.pullRequests = data;
                const map = {};
                data.forEach(pr => {
                    if (pr.files) {
                        pr.files.forEach(f => {
                            map[f] = `https://github.com/erinehart1/sturdy-goggles/blob/main/${f}`;
                        });
                    }
                });
                this.fileLinkMap = map;
            })
            .catch(error => {
                console.error('Error fetching PRs', error);
            });
    }
}
