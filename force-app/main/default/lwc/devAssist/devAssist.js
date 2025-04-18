import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';
import getMergedPRs from '@salesforce/apex/GitHubService.getMergedPRs';
import getUserProfileName from '@salesforce/apex/GitHubService.getUserProfileName';

export default class DevAssist extends LightningElement {
    @track pullRequests;
    @track fileLinkMap = {};
    @track inferredPath;
    @track userProfile;

    @wire(CurrentPageReference)
    getPageReference(pageRef) {
        if (pageRef && pageRef.attributes && pageRef.attributes.recordId) {
            const recordId = pageRef.attributes.recordId;
            this.resolveMetadataFromRecord(recordId);
        }
    }

    resolveMetadataFromRecord(recordId) {
        getRecord({ recordId, fields: ['RecordType.Name', 'RecordTypeId', 'Id', 'Name'] })
            .then(record => {
                const objectName = record.apiName;
                const recordType = record.fields.RecordType?.displayValue;
                this.inferredPath = `force-app/main/default/objects/${objectName}/fields/My_Second_Field__c.field-meta.xml`;
                this.loadPullRequests();
            })
            .catch(error => {
                console.error('Error resolving record info:', error);
            });

        getUserProfileName()
            .then(profile => {
                this.userProfile = profile;
                console.log('User profile:', profile);
            })
            .catch(error => {
                console.error('Error fetching profile:', error);
            });
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